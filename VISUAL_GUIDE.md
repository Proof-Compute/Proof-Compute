# PROOF COMPUTE — VISUAL QUICK REFERENCE

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     PROOF COMPUTE COMPUTE v1.0.0                           ║
║                                                                              ║
║           Commercial Enterprise Quality — Deterministic Execution            ║
║                    Portable Proofs | Event-Native Messaging                  ║
║              Full Replay | Minimized Trust | Zero External Deps             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER APPLICATION                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HTTP REST API (port 8787)                            │
│  POST /run      Execute flow  → CIDs + Proof + Final State                 │
│  POST /verify   Verify proof  → Valid/Invalid                              │
│  POST /replay   Re-execute    → Deterministic replay                       │
│  GET  /info     Server info   → Capabilities                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NODE LAYER (Network)                               │
│  ├─ messages.js         Event-native envelopes                             │
│  ├─ server.js           HTTP API handler                                    │
│  └─ store.js            Persistent storage (filesystem/SQL/KV)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENGINE LAYER (Execution)                              │
│  ├─ execute.js          Deterministic flow execution                       │
│  └─ proof.js            Proof generation from execution result             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KERNEL LAYER (Pure Core)                               │
│                                                                              │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │  canonical.js      │  │  cid.js          │  │  merkle.js           │   │
│  │  ──────────────    │  │  ─────────────   │  │  ─────────────────   │   │
│  │  Deterministic     │  │  SHA-256 Content │  │  Merkle Trees &      │   │
│  │  JSON (no floats,  │  │  Identifiers     │  │  Verification        │   │
│  │  sorted keys,      │  │  (CID format)    │  │  (leaf proofs)       │   │
│  │  no undefined)     │  │                  │  │                      │   │
│  └────────────────────┘  └──────────────────┘  └──────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────┐  ┌─────────────────────────┐  │
│  │  registry.js                           │  │  reducers/              │  │
│  │  ────────────────────────────────────  │  │  ────────────────       │  │
│  │  Lockable reducer registry             │  │  core/sum       Pure    │  │
│  │  (sealed at startup, no runtime muts)  │  │  core/kv        logic   │  │
│  │                                        │  │  core/list      only    │  │
│  │  GUARANTEE: Same reducer always        │  │  core/ledger    (no     │  │
│  │  produces same result                  │  │                 I/O)    │  │
│  └────────────────────────────────────────┘  └─────────────────────────┘  │
│                                                                              │
│  ⚠️  NO: Date.now() | Math.random() | I/O | External calls                │
│  ✓  YES: Pure functions | Determinism | Replay | Proofs                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## EXECUTION FLOW

```
                        FLOW SUBMISSION
                              ↓
                    { reducer, initialState, events }
                              ↓
                    ┌─────────────────────┐
                    │  Validate Structure │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │  Get Reducer Fn     │ (from registry)
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │  Initialize DAG     │ state[0]
                    └──────────┬──────────┘
                               ↓
        ┌──────────────────────┴──────────────────────┐
        │      FOR EACH EVENT IN SEQUENCE            │
        │                                             │
        │  ┌────────────────────────────────────┐   │
        │  │ Call reducer(state, event)         │   │
        │  └────────────┬───────────────────────┘   │
        │               ↓                            │
        │  ┌────────────────────────────────────┐   │
        │  │ Validate canonical output          │   │
        │  └────────────┬───────────────────────┘   │
        │               ↓                            │
        │  ┌────────────────────────────────────┐   │
        │  │ Compute: CID, hash, add to DAG     │   │
        │  └────────────┬───────────────────────┘   │
        │               ↓                            │
        │           state = nextState                │
        └──────────────┬──────────────────────────┘
                       ↓
                    EXECUTION COMPLETE
                       ↓
            ┌─────────────────────────────────┐
            │  Compute Aggregate CIDs:        │
            │                                 │
            │  inputCid    = CID(flow)       │
            │  outputCid   = CID(finalState) │
            │  dagRootCid  = Merkle(dag)     │
            └──────────┬────────────────────┘
                       ↓
            ┌─────────────────────────────────┐
            │  Generate Proof                 │
            │  {                              │
            │    v, inputCid, outputCid,      │
            │    dagRootCid, dagSize,         │
            │    dagLeaves[]                  │
            │  }                              │
            └──────────┬────────────────────┘
                       ↓
            ┌─────────────────────────────────┐
            │  Store persistently (CID-addr)  │
            │                                 │
            │  .proof-compute/flows/<inputCid>.json   │
            │  .proof-compute/proofs/<proofCid>.json  │
            │  .proof-compute/executions/<...>.json   │
            └──────────┬────────────────────┘
                       ↓
            ┌─────────────────────────────────┐
            │  Return to user:                │
            │  {                              │
            │    ok: true,                    │
            │    inputCid, outputCid,         │
            │    proofCid,                    │
            │    output,                      │
            │    dagSize                      │
            │  }                              │
            └─────────────────────────────────┘
```

## VERIFICATION FLOW

```
        PROOF VERIFICATION REQUEST
               ↓
        proofCid + (optional: replay=true)
               ↓
    ┌─────────────────────────┐
    │ Retrieve proof by CID    │
    │ (from persistent store)  │
    └──────────┬──────────────┘
               ↓
    ┌─────────────────────────┐
    │ Validate proof structure│
    └──────────┬──────────────┘
               ↓
    IF replay=true:
        ├─ Retrieve flow by inputCid
        ├─ Re-execute (pure function)
        ├─ Compare CIDs:
        │   ├─ result.outputCid === proof.outputCid ?
        │   ├─ result.dagRootCid === proof.dagRootCid ?
        │   └─ result.dag.length === proof.dagSize ?
        │
        └─ If all match: ✓ VALID
           If any differ: ✗ INVALID
    ELSE:
        └─ Return proof metadata only

    Response:
    {
      ok: true,
      valid: true,
      proofCid,
      replayValid: true,
      eventCount
    }
```

## DATA STRUCTURES

### Flow
```javascript
{
  reducer: "core/sum",              // Reducer name (locked at startup)
  initialState: 0,                   // Initial state (any canonical value)
  events: [
    { type: "add", amount: 5 },      // Immutable event
    { type: "add", amount: 3 }       // Events are deterministic inputs
  ]
}
```

### Execution Result
```javascript
{
  inputCid: "cid:sha256:abc123...",  // Hash of entire flow
  outputCid: "cid:sha256:def456...", // Hash of final state
  dagRootCid: "cid:sha256:ghi789...",// Merkle root of DAG
  dag: [                              // Complete state history
    {
      seq: 0,
      stateCid: "cid:sha256:...",
      stateHash: "abc123...",
      eventCid: null,
      eventHash: null,
      prevStateCid: null
    },
    { seq: 1, stateCid: "...", ... },
    // ... one entry per event
  ],
  finalState: 8                       // Result user sees
}
```

### Proof
```javascript
{
  v: 1,                              // Version
  inputCid: "cid:sha256:...",        // Flow hash
  outputCid: "cid:sha256:...",       // Result hash
  dagRootCid: "cid:sha256:...",      // Merkle root
  dagSize: 3,                        // Total DAG nodes
  dagLeaves: [                       // Full DAG for verification
    { seq, stateCid, stateHash, ... },
    // ... complete history
  ]
}
```

### Message
```javascript
{
  v: 1,
  nodeId: "proof-compute:node:abc123",      // Stable node identity
  inputCid: "cid:sha256:...",
  outputCid: "cid:sha256:...",
  proofCid: "cid:sha256:...",
  flow: { ... },                     // Complete flow
  proof: { ... },                    // Complete proof
  sig: "<hmac-hex>",                 // Optional signature
  ts: 1234567890                     // Metadata only
}
```

## BUILT-IN REDUCERS

### core/sum (Number Accumulation)
```javascript
State:  number
Events:
  { type: "add", amount: number }    → state + amount
  { type: "reset" }                   → 0
```

### core/kv (Key-Value Store)
```javascript
State:  { [key]: value }
Events:
  { type: "set", key, value }        → { ...state, [key]: value }
  { type: "del", key }                → { ...state, [key]: deleted }
  { type: "clear" }                   → {}
```

### core/list (Array Operations)
```javascript
State:  any[]
Events:
  { type: "push", value }            → [...state, value]
  { type: "pop" }                     → state.slice(0, -1)
  { type: "insert", index, value }   → splice at index
  { type: "remove", index }          → splice out index
  { type: "clear" }                   → []
```

### core/ledger (Transaction Journal)
```javascript
State:  { entries: [{ id, entryType, amount, balance, seq }] }
Events:
  { type: "entry", id, entryType, amount }
    → Add entry + recompute balances
  { type: "revert", entryId }
    → Remove entry + recompute balances
  { type: "clear" }                   → Clear all entries
```

## TRUST MODEL

```
                    Trust Boundary
                    ═════════════
                          ↓
        ┌─────────────────────────────────┐
        │ MUST TRUST                      │
        ├─────────────────────────────────┤
        │ ✓ Reducer function logic        │
        │ ✓ Event schema definitions      │
        │ ✓ Initial state                 │
        └─────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────┐
        │ TRUST-FREE (Verify by exec)     │
        ├─────────────────────────────────┤
        │ ✓ CID hashing                   │
        │ ✓ DAG structure                 │
        │ ✓ Proof correctness             │
        │ ✓ Message transport             │
        │ ✓ Node identity                 │
        │ ✓ Storage integrity             │
        │ ✓ Signature validity            │
        └─────────────────────────────────┘
```

## GUARANTEES

```
┌──────────────────────────────────────────────────────────────┐
│                   DETERMINISM GUARANTEE                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Given: Same flow + Same reducer                             │
│         (no I/O, no date, no randomness)                     │
│                                                               │
│  Then:  Same result on EVERY execution                       │
│         Same CIDs every time                                 │
│         Same proofs always                                   │
│         Verifiable by anyone                                 │
│                                                               │
│  Therefore: executeFlow(flow) === executeFlow(flow)          │
│             result.outputCid === result2.outputCid (always)  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## DEPLOYMENT

```
DEVELOPMENT
  npm install
  npm run dev              # Auto-reload
  npm test                 # Run tests

PRODUCTION
  npm install --production
  npm start -- --port 8787 --store /var/proof-compute/store
  NODE_ENV=production pm2 start src/cli.js

DOCKER
  docker build -t proof-compute .
  docker run -p 8787:8787 -v proof-compute-store:/app/.proof-compute proof-compute

SYSTEMD
  /etc/systemd/system/proof-compute.service
  systemctl start proof-compute
  systemctl enable proof-compute
```

## FILES AT A GLANCE

```
proof-compute/
│
├── src/kernel/              ← Pure deterministic core
│   ├── canonical.js         ← JSON serialization
│   ├── cid.js              ← Content IDs
│   ├── merkle.js           ← Trees
│   ├── registry.js         ← Reducer registry
│   └── reducers/           ← Built-in reducers
│
├── src/engine/              ← Execution orchestration
│   ├── execute.js          ← Flow execution
│   └── proof.js            ← Proof generation
│
├── src/node/                ← Network & persistence
│   ├── server.js           ← HTTP API
│   ├── store.js            ← Storage
│   └── messages.js         ← Envelopes
│
├── src/cli.js               ← CLI interface
│
├── examples/                ← Usage examples
│   ├── basic.js            ← 6 patterns
│   └── client.js           ← HTTP demo
│
├── README.md                ← Quick start
├── ARCHITECTURE.md          ← Deep dive
├── DEPLOYMENT.md            ← Production setup
└── PROJECT_SUMMARY.md       ← This project
```

## QUICK COMMANDS

```bash
# Install
npm install

# Test
npm test

# Develop
npm run dev

# Run
npm start

# Server info
curl http://localhost:8787/info

# Execute flow
curl -X POST http://localhost:8787/run \
  -H 'content-type: application/json' \
  -d '{"flow": {...}}'

# Verify proof
curl -X POST http://localhost:8787/verify \
  -H 'content-type: application/json' \
  -d '{"proofCid": "cid:sha256:..."}'

# Replay
curl -X POST http://localhost:8787/replay \
  -H 'content-type: application/json' \
  -d '{"inputCid": "cid:sha256:..."}'
```

## ERROR CODES

```
REDUCER_ERROR              Reducer function threw
REDUCER_RETURNED_UNDEFINED Reducer returned undefined
NON_CANONICAL_OUTPUT       Non-canonical state from reducer
INVALID_FLOW               Flow schema validation failed
```

---

**Ready to build proof-native systems with minimum trust.**

See README.md, ARCHITECTURE.md, and DEPLOYMENT.md for complete details.
