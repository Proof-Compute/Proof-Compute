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
 * examples/basic.js
 * 
 * Basic usage patterns for ProofCompute
 */

import { executeFlow, generateProof, cidOf } from '../src/index.js';

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        ProofCompute — BASIC USAGE EXAMPLES                ║
║                                                               ║
║  No external dependencies. Pure deterministic execution.     ║
║  Same input = same output on every machine.                  ║
╚═══════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────
// EXAMPLE 1: Sum Accumulator
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 1: Sum Accumulator ─');
console.log('Reducer: core/sum');
console.log('State: number');
console.log('Events: add, reset\n');

const sumFlow = {
  reducer: 'core/sum',
  initialState: 0,
  events: [
    { type: 'add', amount: 10 },
    { type: 'add', amount: 5 },
    { type: 'add', amount: 3 }
  ]
};

try {
  const sumResult = executeFlow(sumFlow);
  const sumProof = generateProof(sumResult);
  
  console.log('Final State:', sumResult.finalState);
  console.log('Input CID: ', sumResult.inputCid.slice(0, 30) + '...');
  console.log('Output CID:', sumResult.outputCid.slice(0, 30) + '...');
  console.log('DAG Size:  ', sumResult.dag.length);
  console.log('Proof Size:', sumProof.dagSize);
} catch (err) {
  console.error('ERROR:', err.message);
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE 2: Key-Value Store
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 2: Key-Value Store ─');
console.log('Reducer: core/kv');
console.log('State: { [key]: value }');
console.log('Events: set, del, clear\n');

const kvFlow = {
  reducer: 'core/kv',
  initialState: {},
  events: [
    { type: 'set', key: 'username', value: 'alice' },
    { type: 'set', key: 'email', value: 'alice@example.com' },
    { type: 'set', key: 'age', value: 30 },
    { type: 'del', key: 'age' }
  ]
};

try {
  const kvResult = executeFlow(kvFlow);
  
  console.log('Final State:', JSON.stringify(kvResult.finalState, null, 2));
  console.log('DAG Size:   ', kvResult.dag.length);
  
  // Show state transitions
  console.log('\nState Transitions:');
  for (let i = 0; i < kvResult.dag.length; i++) {
    const node = kvResult.dag[i];
    const label = i === 0 ? 'Initial' : `After event ${i}`;
    console.log(`  ${label}: ${node.stateCid.slice(0, 25)}...`);
  }
} catch (err) {
  console.error('ERROR:', err.message);
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE 3: List Operations
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 3: List Operations ─');
console.log('Reducer: core/list');
console.log('State: any[]');
console.log('Events: push, pop, insert, remove\n');

const listFlow = {
  reducer: 'core/list',
  initialState: [],
  events: [
    { type: 'push', value: 'apple' },
    { type: 'push', value: 'banana' },
    { type: 'insert', index: 0, value: 'aardvark' },
    { type: 'push', value: 'cherry' }
  ]
};

try {
  const listResult = executeFlow(listFlow);
  
  console.log('Final State:', JSON.stringify(listResult.finalState, null, 2));
  console.log('DAG Size:   ', listResult.dag.length);
} catch (err) {
  console.error('ERROR:', err.message);
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE 4: Ledger / Transaction Journal
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 4: Ledger (Transaction Journal) ─');
console.log('Reducer: core/ledger');
console.log('State: { entries: [...] }');
console.log('Events: entry, revert, clear\n');

const ledgerFlow = {
  reducer: 'core/ledger',
  initialState: { entries: [] },
  events: [
    { type: 'entry', id: 'dep1', entryType: 'deposit', amount: 1000 },
    { type: 'entry', id: 'fee1', entryType: 'fee', amount: -10 },
    { type: 'entry', id: 'int1', entryType: 'interest', amount: 5 },
    { type: 'entry', id: 'wth1', entryType: 'withdrawal', amount: -250 }
  ]
};

try {
  const ledgerResult = executeFlow(ledgerFlow);
  const finalBalance = ledgerResult.finalState.entries[
    ledgerResult.finalState.entries.length - 1
  ].balance;
  
  console.log('Ledger Entries:');
  for (const entry of ledgerResult.finalState.entries) {
    console.log(
      `  [${entry.seq}] ${entry.entryType.padEnd(10)} ${entry.amount.toString().padStart(7)} → Balance: ${entry.balance}`
    );
  }
  
  console.log(`\nFinal Balance: ${finalBalance}`);
  console.log('DAG Size:     ', ledgerResult.dag.length);
} catch (err) {
  console.error('ERROR:', err.message);
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE 5: Determinism Verification
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 5: Determinism Verification ─');
console.log('Same flow → same CIDs on every execution\n');

const testFlow = {
  reducer: 'core/sum',
  initialState: 100,
  events: [
    { type: 'add', amount: 25 },
    { type: 'add', amount: -15 }
  ]
};

try {
  const exec1 = executeFlow(testFlow);
  const exec2 = executeFlow(testFlow);
  const exec3 = executeFlow(testFlow);
  
  console.log('Execution 1:');
  console.log('  Input CID: ', exec1.inputCid.slice(0, 25) + '...');
  console.log('  Output CID:', exec1.outputCid.slice(0, 25) + '...');
  
  console.log('\nExecution 2:');
  console.log('  Input CID: ', exec2.inputCid.slice(0, 25) + '...');
  console.log('  Output CID:', exec2.outputCid.slice(0, 25) + '...');
  
  console.log('\nExecution 3:');
  console.log('  Input CID: ', exec3.inputCid.slice(0, 25) + '...');
  console.log('  Output CID:', exec3.outputCid.slice(0, 25) + '...');
  
  const match = exec1.inputCid === exec2.inputCid && 
                exec2.inputCid === exec3.inputCid &&
                exec1.outputCid === exec2.outputCid &&
                exec2.outputCid === exec3.outputCid;
  
  console.log(`\nDeterminism Check: ${match ? '✓ PASS' : '✗ FAIL'}`);
} catch (err) {
  console.error('ERROR:', err.message);
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE 6: Error Handling
// ─────────────────────────────────────────────────────────────

console.log('\n─ EXAMPLE 6: Error Handling ─');
console.log('Reducers throw typed errors\n');

const badFlow = {
  reducer: 'core/sum',
  initialState: 0,
  events: [
    { type: 'add', amount: 5 },
    { type: 'invalid_event_type', amount: 10 }
  ]
};

try {
  executeFlow(badFlow);
} catch (err) {
  console.log('Caught error:');
  console.log('  Code:       ', err.code);
  console.log('  Category:   ', err.category);
  console.log('  Event Index:', err.eventIndex);
  console.log('  Message:    ', err.message.split('\n')[0]);
}

console.log('\n✓ All examples completed.');
