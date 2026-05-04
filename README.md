# proof-compute

**Deterministic compute with verifiable proofs.**

Run a reducer over events. Get a cryptographic proof. Replay it anywhere — same input always produces the same output and the same CIDs.

```
event[] → reducer → state + proof
                         ↓
               verify anywhere, anytime
```

## Install

```bash
npm install proof-compute
```

Requires Node.js ≥ 20 and Ollama running locally for AI reducers.

## Quickstart

```js
import { executeFlow, generateProof, verifyExecution } from 'proof-compute';

const flow = {
  reducer: 'core/ledger',
  initialState: { entries: [] },
  events: [
    { type: 'entry', id: 'dep-1', entryType: 'deposit',  amount: 10000 },
    { type: 'entry', id: 'pay-1', entryType: 'payment',  amount: -2500 },
    { type: 'entry', id: 'fee-1', entryType: 'fee',      amount: -50   }
  ]
};

const result = executeFlow(flow);
const proof  = generateProof(result);

console.log(result.finalState);
// { entries: [...], balance: 7450 }

console.log(result.outputCid);
// cid:sha256:e3b0c44298fc1c149afb...  ← same on every machine

console.log(verifyExecution(result, proof));
// true
```

## Built-in Reducers

| Name | State shape | Events |
|---|---|---|
| `core/kv` | `{ key: value }` | `set`, `del`, `clear` |
| `core/list` | `{ items: [] }` | `push`, `pop`, `insert`, `remove` |
| `core/ledger` | `{ entries: [] }` | `entry` |
| `core/sum` | `{ value: 0 }` | `add`, `sub`, `reset` |
| `ai/code-review` | `{ reviews: [] }` | `review` |

## AI Code Review (local Ollama)

```js
import { executeFlowAsync, generateProof } from 'proof-compute';

const flow = {
  reducer: 'ai/code-review',
  initialState: { reviews: [], cacheHits: 0, cacheMisses: 0 },
  events: [
    {
      type: 'review',
      language: 'javascript',
      code: `const q = "SELECT * FROM users WHERE id = " + id;`
    }
  ]
};

// OLLAMA_HOST=http://localhost:11434 (default)
// OLLAMA_MODEL=mistral               (default: mistral, also llama3.2)
const result = await executeFlowAsync(flow);
const proof  = generateProof(result);

console.log(result.finalState.reviews[0].summary);
// "SQL injection vulnerability detected"

console.log(verifyExecution(result, proof));
// true — AI output is cached by content hash, replay is deterministic
```

## Custom Reducers

```js
import { registerReducer, executeFlow, generateProof } from 'proof-compute';

registerReducer('my/counter', (state, event) => {
  if (event.type === 'inc') return { count: state.count + 1 };
  if (event.type === 'dec') return { count: state.count - 1 };
  throw new Error(`Unknown: ${event.type}`);
});

const result = executeFlow({
  reducer: 'my/counter',
  initialState: { count: 0 },
  events: [{ type: 'inc' }, { type: 'inc' }, { type: 'dec' }]
});

// result.finalState → { count: 1 }
// result.outputCid  → deterministic CID, same everywhere
```

## How Proofs Work

Every execution produces a DAG where each node contains:
- the event CID
- the resulting state CID  
- the previous state CID

A Merkle root across all state hashes gives you a single fingerprint for the entire execution history. To verify: re-run the flow, compare CIDs.

```
state[0] ──event[0]──▶ state[1] ──event[1]──▶ state[2]
   │                       │                       │
 cid:sha256:...          cid:sha256:...          cid:sha256:...
                                                    │
                                            Merkle root = dagRootCid
```

## License

AGPL-3.0 (open source) / Commercial License (businesses & governments)

Free for open-source projects. A paid commercial license is required for
businesses, government agencies, and proprietary use.

See [LICENSE](LICENSE) or contact xhecarpenxer@gmail.com for commercial licensing.
