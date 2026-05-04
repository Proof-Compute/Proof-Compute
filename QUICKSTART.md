# Proof Compute — Quickstart Guide

## What You Built

A **deterministic compute protocol** where:
- AI can propose
- Reducers validate
- Proofs are generated
- Everything is verifiable

This is **infrastructure**, not an app.

## Installation

```bash
cd proof-compute
chmod +x src/cli.js
npm link  # Makes 'proof' command available globally
```

## Your First Proof (60 seconds)

### 1. Run a flow

```bash
proof run examples/hello-proof.json
```

You'll see:
```
✅ Execution complete

Final State:  6
Input CID:    cid:sha256:c7d7d8...
Output CID:   cid:sha256:e7f6c0...
DAG Root CID: cid:sha256:3bd713...
```

### 2. Verify the proof

```bash
proof verify cid:sha256:e7f6c0...
```

✅ **That's it.** You just ran a deterministic flow and got a verifiable proof.

## What Just Happened

1. **Proof Compute reads the flow** (`hello-proof.json`)
2. **Executed it deterministically** (same input → same output)
3. **Generated a proof** (CID-addressed DAG)
4. **Made it verifiable** (anyone can replay and confirm)

## The Flow Format

```json
{
  "reducer": "core/sum",
  "initialState": 0,
  "events": [
    { "type": "add", "amount": 1 },
    { "type": "add", "amount": 2 },
    { "type": "add", "amount": 3 }
  ]
}
```

- **reducer**: Which deterministic function to use
- **initialState**: Starting state
- **events**: Sequence of events to process

## Built-in Reducers

### `core/sum` - Number accumulation
```json
{
  "reducer": "core/sum",
  "initialState": 0,
  "events": [
    { "type": "add", "amount": 10 },
    { "type": "add", "amount": -5 },
    { "type": "reset" }
  ]
}
```

### `core/kv` - Key-value store
```json
{
  "reducer": "core/kv",
  "initialState": {},
  "events": [
    { "type": "set", "key": "name", "value": "Alice" },
    { "type": "set", "key": "age", "value": 30 },
    { "type": "del", "key": "age" }
  ]
}
```

### `core/list` - Array operations
```json
{
  "reducer": "core/list",
  "initialState": [],
  "events": [
    { "type": "push", "value": "apple" },
    { "type": "push", "value": "banana" },
    { "type": "insert", "index": 0, "value": "aardvark" },
    { "type": "pop" }
  ]
}
```

### `core/ledger` - Transaction journal
```json
{
  "reducer": "core/ledger",
  "initialState": { "entries": [] },
  "events": [
    { "type": "entry", "id": "dep1", "entryType": "deposit", "amount": 1000 },
    { "type": "entry", "id": "fee1", "entryType": "fee", "amount": -10 }
  ]
}
```

## Try the Examples

```bash
# Simple sum
proof run examples/hello-proof.json

# Code review workflow
proof run examples/code-review.json

# Financial ledger
proof run examples/financial-ledger.json

# See all examples
ls examples/*.json
```

## Running as a Service

```bash
proof serve --port 8787
```

Then POST to `http://localhost:8787/run` with your flow.

## What Makes This Different

### Traditional AI Systems:
```
input → model → output (trust it)
```

### Your System:
```
input → AI proposal → reducer validates → proof → replay confirms
```

**AI has zero authority unless it survives reduction + replay.**

## Use Cases This Enables

All of these can run on the same protocol:

1. **Verifiable AI code review** - AI finds issues, reducers validate them
2. **Auditable compliance** - AI checks rules, reducers enforce policy
3. **Reproducible scientific pipelines** - AI analyzes, reducers verify math
4. **Transparent content moderation** - AI flags content, reducers apply rules
5. **Trustworthy financial modeling** - AI forecasts, reducers check constraints

## Next Steps

### For Developers:
1. Add your own reducer (see `src/kernel/reducers/`)
2. Create custom flows for your domain
3. Build an HTTP API client

### For Product:
1. Pick ONE use case to prove
2. Build 3 example flows
3. Show deterministic replay works

### For Platform:
1. Open source the core
2. Monetize the operators
3. Let ecosystem build flows

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Application Layer (domain-specific flows)         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Proof Compute (deterministic runtime + proofs)       │
│  • Execute flows                                        │
│  • Generate CID-addressed proofs                        │
│  • Verify replay                                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Kernel (canonical state, reducers, CIDs)               │
│  • Pure functions only                                  │
│  • No I/O in execution path                             │
│  • Deterministic by construction                        │
└─────────────────────────────────────────────────────────┘
```

## The Key Insight

You haven't built a product.

**You've built a protocol.**

Like HTTP doesn't choose between blogs and banking,
your system doesn't choose between code review and compliance.

It's the **trust layer for AI systems**.

---

**Questions?** Run `proof help` or check the examples.
