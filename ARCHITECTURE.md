# Proof Compute — Architecture & Design

## System Overview

Proof Compute is a reduced compute primitive with six core principles:

1. **Derived State** — State computed from events, never persisted directly
2. **Deterministic Execution** — Pure functions, same input = same output everywhere
3. **Event-Native Messaging** — Flows transport as immutable CID-addressed events
4. **Portable Proofs** — Verifiable anywhere without vendor lock-in
5. **Full Replay Capability** — Complete history enables audit and time-travel
6. **Minimized Trust** — Only reducer logic requires trust; everything else verifies by re-execution

## Data Flow

```
CREATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Flow { reducer, initialState, events }
         ↓ (user creates)
       
EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  executeFlow(flow)
    ├─ Validate structure
    ├─ Get reducer function
    ├─ Initialize DAG with state[0]
    ├─ For each event:
    │   ├─ Call reducer(state, event)
    │   ├─ Validate output is canonical
    │   ├─ Compute CIDs & hashes
    │   └─ Record in DAG
    ├─ Compute Merkle root
    └─ Return ExecutionResult {
         inputCid, outputCid, dagRootCid, dag[], finalState
       }

PROOF GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  generateProof(result)
    └─ Proof {
         v, inputCid, outputCid, dagRootCid,
         dagSize, dagLeaves[]
       }

STORAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Store.saveFlow(flow)      → .proof-compute/flows/<cid>.json
  Store.saveProof(proof)    → .proof-compute/proofs/<cid>.json
  Store.saveExecution(...)  → .proof-compute/executions/<cid>.json

VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 1: Retrieve stored flow by inputCid
  Step 2: Re-execute (same pure function)
  Step 3: Compare CIDs:
    ├─ result.outputCid === proof.outputCid ✓
    ├─ result.dagRootCid === proof.dagRootCid ✓
    └─ result.dag.length === proof.dagSize ✓
  
  If all match → VALID
  If any mismatch → INVALID
```

## Kernel Layer

The kernel is the deterministic core—pure functions, no I/O.

### Canonical JSON (`canonical.js`)

Rules for unambiguous serialization:

```javascript
// Keys sorted alphabetically
{ b: 2, a: 1 } → {"a":1,"b":2}

// No whitespace
{ x: [1, 2] } → {"x":[1,2]}

// Safe integers only (no floats, no Infinity, no NaN)
42      ✓
42.0    ✗ (ambiguous)
NaN     ✗ (non-deterministic)

// No undefined values
{ a: undefined } → ✗ (throw)

// Plain objects only (no class instances)
new Map()       ✗ (throw)
{}              ✓
```

### Content Identifiers (`cid.js`)

```javascript
CID = "cid:sha256:" + hex(SHA256(canonical(value)))

// Same value → same CID (deterministic)
cidOf({a:1}) === cidOf({a:1})  // always true

// Different values → different CIDs
cidOf({a:1}) !== cidOf({a:2})  // always different
```

### Merkle Tree (`merkle.js`)

```
DAG with states at each level:

state[0] → hash0
state[1] → hash1
state[2] → hash2
state[3] → hash3

Merkle root:
       root
      /    \
    h01    h23
   /  \   /  \
  h0  h1 h2  h3
```

Enables efficient proof of inclusion and ordering.

### Reducer Registry (`registry.js`)

```javascript
registerReducer('core/sum', sumReducer);
registerReducer('core/kv', kvReducer);

// At startup: lockRegistry()
// ↓
// No new reducers can be added
// Ensures determinism across restarts
```

## Engine Layer

Orchestrates execution and proof generation.

### Flow Execution (`execute.js`)

**Pure function:** no I/O, no Date.now(), no Math.random()

```javascript
executeFlow(flow) {
  // Validate flow schema
  const reducer = getReducer(flow.reducer);
  
  // Build DAG
  const dag = [{ seq: 0, stateCid, ... }];
  let state = flow.initialState;
  
  for (const event of flow.events) {
    // Trust boundary: call reducer
    const nextState = reducer(state, event);
    
    // Verify output is canonical
    assertCanonical(nextState);
    
    // Record in DAG
    dag.push({ seq, stateCid, stateHash, eventCid, ... });
    state = nextState;
  }
  
  // Compute aggregate CIDs
  return {
    inputCid: cidOf(flow),
    outputCid: cidOf(finalState),
    dagRootCid: merkleRoot(dag.map(n => n.stateHash)),
    dag,
    finalState
  };
}
```

**Error handling:**
- Reducer throws → categorized error
- Non-canonical output → rejected
- Undefined return → error
- CID mismatch → error

### Proof Generation (`proof.js`)

```javascript
generateProof(result) {
  return {
    v: 1,
    inputCid: result.inputCid,
    outputCid: result.outputCid,
    dagRootCid: result.dagRootCid,
    dagSize: result.dag.length,
    dagLeaves: result.dag.map(node => ({
      seq, stateCid, stateHash, eventCid, ...
    }))
  };
}
```

Proofs are hashable and portable—can be transmitted, stored, verified anywhere.

## Node Layer

Network, persistence, HTTP API.

### Messages (`messages.js`)

Event-native envelopes with HMAC signatures (optional).

```javascript
Message {
  v: 1,
  nodeId: "proof-compute:node:abc123",
  inputCid: "cid:sha256:...",
  outputCid: "cid:sha256:...",
  proofCid: "cid:sha256:...",
  flow: { ... },
  proof: { ... },
  sig: "<hmac-hex>",
  ts: 1234567890
}
```

Receiver:
1. Validate message structure
2. Verify flow CID matches
3. Verify proof CID matches
4. Re-execute flow to verify proofCid
5. Accept or reject

**Trust model:** Signature is optional. Proof verification is mandatory.

### Persistent Storage (`store.js`)

```
.proof-compute/
├── flows/
│   ├── abc123....json    (flow definition)
│   └── ...
├── proofs/
│   ├── def456....json    (proof object)
│   └── ...
└── executions/
    ├── ghi789....json    (execution metadata)
    └── ...
```

All addressed by CID—immutable, content-addressable, deduplicable.

### HTTP API (`server.js`)

```
POST /run
  Execute a flow, store result, return CIDs

POST /verify
  Validate proof, optionally replay

POST /replay
  Re-execute stored flow

GET /info
  Server information
```

## Built-in Reducers

### core/sum

```javascript
state: number
events:
  { type: 'add', amount: number }
  { type: 'reset' }
```

### core/kv

```javascript
state: { [key]: value }
events:
  { type: 'set', key, value }
  { type: 'del', key }
  { type: 'clear' }
```

### core/list

```javascript
state: any[]
events:
  { type: 'push', value }
  { type: 'pop' }
  { type: 'insert', index, value }
  { type: 'remove', index }
  { type: 'clear' }
```

### core/ledger

```javascript
state: { entries: [{ id, entryType, amount, balance, seq }] }
events:
  { type: 'entry', id, entryType, amount }
  { type: 'revert', entryId }
  { type: 'clear' }
```

## Determinism Guarantees

### No Randomness
```javascript
// ✗ Math.random() — excluded from reducer path
// ✗ crypto.random() — excluded from reducer path
// ✗ Date.now() — excluded from reducer path
// ✗ UUID generation — excluded from reducer path
```

### No Floating Point
```javascript
// ✓ Safe integers only
// ✓ Fixed-point arithmetic (scale by 100 for cents)
// ✓ Canonical JSON rejects floats
```

### No External I/O
```javascript
// ✗ HTTP requests
// ✗ Database queries
// ✗ File system access
// ✗ Clock reads
```

### Sealed Registry
```javascript
// Register all reducers before startup
registerReducer('core/sum', sumFn);
registerReducer('core/kv', kvFn);

// Then lock
lockRegistry();

// ✗ No new reducers at runtime
// ✓ Reproducible across machines/restarts
```

## Error Handling

Errors are categorized:

```javascript
{
  category: 'execution',
  code: 'REDUCER_ERROR',
  eventIndex: 2,
  eventType: 'add',
  message: 'Reducer threw: ...',
  cause: Error
}
```

Error codes:
- `REDUCER_ERROR` — Reducer function threw
- `REDUCER_RETURNED_UNDEFINED` — Reducer returned undefined
- `NON_CANONICAL_OUTPUT` — Reducer produced non-canonical state
- `INVALID_FLOW` — Flow schema validation failed

## Replay & Audit

Because flows and proofs are immutable and CID-addressed:

1. **Full History** — All executions are stored
2. **Deterministic Replay** — Same flow always produces same result
3. **Cross-Verification** — Any node can verify any proof
4. **Audit Trail** — Complete record of state transitions
5. **Time Travel** — Query any historical state by CID

```javascript
// Audit: Show all transitions
for (const node of proof.dagLeaves) {
  console.log(`state[${node.seq}] → ${node.stateCid}`);
}

// Replay: Re-execute from checkpoint
const flow = store.getFlow(proof.inputCid);
const result = executeFlow(flow);

// Verify: Match proof
assert(result.outputCid === proof.outputCid);
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Execute N events | O(N) | Linear in event count |
| Compute CID | O(1) | Single SHA-256 hash |
| Merkle root | O(N) | One hash per state |
| Verify proof | O(N) | Re-execute + compare |
| Storage (FS) | O(1) | Direct file write |
| Storage (SQL) | O(log N) | Index lookup |

Typical execution: <100ms for 1000 events on commodity hardware.

## Security Model

```
Trust Boundary (must verify):
  • Reducer function logic
  • Event schema validation
  • Initial state

Trust-Free (verify by re-execution):
  • CIDs
  • DAG structure
  • Message transport
  • Node identity
  • Proof correctness
  • Storage integrity
```

## Future Extensions

Without breaking determinism:

- **Custom reducers** (register before lock)
- **Partial proofs** (Merkle proofs of subset)
- **Cross-verification** (distributed nodes)
- **Ollamassistant integration** (deterministic AI scoring)
- **State snapshots** (efficient long histories)
- **Proof aggregation** (batch verification)

---

**Proof Compute** is designed for production enterprise use with minimal trust requirements and maximum auditability.
