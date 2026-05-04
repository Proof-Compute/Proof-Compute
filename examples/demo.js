#!/usr/bin/env node

/*
 * ============================================================================
 * ProofCompute
 * ============================================================================
 * Copyright (c) 2026 James Chapman <xhecarpenxer@gmail.com>
 * GitHub: https://github.com/xhecarpenxer
 *
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) for
 * open-source use. Commercial use requires a paid license.
 *
 * AGPL-3.0:  https://www.gnu.org/licenses/agpl-3.0.txt
 * Commercial: xhecarpenxer@gmail.com
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 * ============================================================================
 */


/**
 * Full System Demo
 * 
 * Shows: deterministic execution → proof generation → verification
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        ProofCompute — COMPLETE SYSTEM DEMONSTRATION        ║
║                                                               ║
║  Deterministic Compute Protocol with Verifiable Proofs       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

import { executeFlow, generateProof, verifyExecution } from '../src/index.js';

console.log('⚙️  Running demonstration flows...\n');
console.log('═'.repeat(64));

// ─────────────────────────────────────────────────────────────
// Demo 1: Code Review Workflow
// ─────────────────────────────────────────────────────────────

console.log('\n📋 Demo 1: Code Review Workflow\n');
console.log('Scenario: Tracking code review approvals with cryptographic proofs');

const codeReviewFlow = {
  reducer: 'core/kv',
  initialState: {},
  events: [
    { type: 'set', key: 'codeHash', value: 'sha256:abc123' },
    { type: 'set', key: 'reviewStatus', value: 'approved' },
    { type: 'set', key: 'reviewer', value: 'alice@example.com' },
    { type: 'set', key: 'timestamp', value: 1704067200 }
  ]
};

const codeReviewResult = executeFlow(codeReviewFlow);
const codeReviewProof = generateProof(codeReviewResult);

console.log('Final State:', JSON.stringify(codeReviewResult.finalState, null, 2));
console.log('');
console.log('Proof Details:');
console.log('  Input CID: ', codeReviewResult.inputCid.slice(0, 35) + '...');
console.log('  Output CID:', codeReviewResult.outputCid.slice(0, 35) + '...');
console.log('  DAG Root:  ', codeReviewResult.dagRootCid.slice(0, 35) + '...');
console.log('  DAG Nodes: ', codeReviewResult.dag.length);

// ─────────────────────────────────────────────────────────────
// Demo 2: Financial Ledger with Deterministic Math
// ─────────────────────────────────────────────────────────────

console.log('\n═'.repeat(64));
console.log('\n💰 Demo 2: Financial Transaction Ledger\n');
console.log('Scenario: Auditable financial transactions with verifiable balances');

const ledgerFlow = {
  reducer: 'core/ledger',
  initialState: { entries: [] },
  events: [
    { type: 'entry', id: 'deposit-001', entryType: 'deposit', amount: 10000 },
    { type: 'entry', id: 'payment-001', entryType: 'payment', amount: -2500 },
    { type: 'entry', id: 'fee-001', entryType: 'fee', amount: -50 },
    { type: 'entry', id: 'interest-001', entryType: 'interest', amount: 125 }
  ]
};

const ledgerResult = executeFlow(ledgerFlow);
const ledgerProof = generateProof(ledgerResult);

console.log('Ledger Entries:');
ledgerResult.finalState.entries.forEach(entry => {
  const sign = entry.amount >= 0 ? '+' : '';
  console.log(
    `  [${entry.seq}] ${entry.entryType.padEnd(10)} ` +
    `${sign}${entry.amount.toString().padStart(6)} → Balance: ${entry.balance}`
  );
});

const finalBalance = ledgerResult.finalState.entries[ledgerResult.finalState.entries.length - 1].balance;
console.log('');
console.log('Final Balance:', finalBalance);
console.log('Proof CID:    ', ledgerResult.outputCid.slice(0, 35) + '...');

// ─────────────────────────────────────────────────────────────
// Demo 3: Determinism Verification (Replay)
// ─────────────────────────────────────────────────────────────

console.log('\n═'.repeat(64));
console.log('\n🔄 Demo 3: Determinism Verification\n');
console.log('Scenario: Proving same input → same output on every execution');

const testFlow = {
  reducer: 'core/sum',
  initialState: 100,
  events: [
    { type: 'add', amount: 25 },
    { type: 'add', amount: -15 },
    { type: 'add', amount: 50 }
  ]
};

console.log('Executing flow 3 times...\n');

const exec1 = executeFlow(testFlow);
const exec2 = executeFlow(testFlow);
const exec3 = executeFlow(testFlow);

const proof1 = generateProof(exec1);
const proof2 = generateProof(exec2);
const proof3 = generateProof(exec3);

console.log('Execution 1:');
console.log('  Output CID: ', exec1.outputCid);
console.log('  DAG Root:   ', exec1.dagRootCid);
console.log('  Final State:', exec1.finalState);

console.log('\nExecution 2:');
console.log('  Output CID: ', exec2.outputCid);
console.log('  DAG Root:   ', exec2.dagRootCid);
console.log('  Final State:', exec2.finalState);

console.log('\nExecution 3:');
console.log('  Output CID: ', exec3.outputCid);
console.log('  DAG Root:   ', exec3.dagRootCid);
console.log('  Final State:', exec3.finalState);

const allMatch = 
  exec1.outputCid === exec2.outputCid &&
  exec2.outputCid === exec3.outputCid &&
  exec1.dagRootCid === exec2.dagRootCid &&
  exec2.dagRootCid === exec3.dagRootCid;

console.log('\n✓ Determinism Check:', allMatch ? 'PASSED' : 'FAILED');
console.log('  All CIDs match:', allMatch);

// Verify proof structure
const proof1Valid = verifyExecution(exec1, proof1);
const proof2Valid = verifyExecution(exec2, proof2);
const proof3Valid = verifyExecution(exec3, proof3);

console.log('  Proof 1 valid:', proof1Valid);
console.log('  Proof 2 valid:', proof2Valid);
console.log('  Proof 3 valid:', proof3Valid);

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────

console.log('\n═'.repeat(64));
console.log('\n🎯 What This Demonstrates:\n');
console.log('  ✓ Deterministic execution (same input → same output)');
console.log('  ✓ Content-addressed proofs (CID-based verification)');
console.log('  ✓ Full replay capability (independent verification)');
console.log('  ✓ Zero trust in execution (only trust reducers)');
console.log('  ✓ Portable proofs (works across any machine)');
console.log('  ✓ Multiple use cases (code review, finance, compliance)');

console.log('\n🚀 Try It Yourself:\n');
console.log('  proof-compute run examples/hello-proof.json');
console.log('  proof-compute run examples/code-review.json');
console.log('  proof-compute run examples/financial-ledger.json');
console.log('  proof-compute verify <cid>');
console.log('  proof-compute serve --port 8787');

console.log('\n📖 Learn More:\n');
console.log('  cat QUICKSTART.md');
console.log('  cat ARCHITECTURE.md');
console.log('  cat PROJECT_SUMMARY.md');

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                                                               ║');
console.log('║  You just witnessed the foundation for verifiable AI.        ║');
console.log('║                                                               ║');
console.log('║  Next: Pick ONE use case and build 3 example flows.          ║');
console.log('║                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');
