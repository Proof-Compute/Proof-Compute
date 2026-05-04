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

import test from 'node:test';
import assert from 'node:assert';
import { executeFlow } from './execute.js';
import { generateProof } from './proof.js';

test('executeFlow: simple sum reducer', () => {
  const flow = {
    reducer: 'core/sum',
    initialState: 0,
    events: [
      { type: 'add', amount: 5 },
      { type: 'add', amount: 3 },
      { type: 'add', amount: 2 }
    ]
  };
  
  const result = executeFlow(flow);
  
  assert.strictEqual(result.finalState, 10);
  assert.strictEqual(result.dag.length, 4); // initial + 3 events
  assert.ok(result.inputCid.startsWith('cid:sha256:'));
  assert.ok(result.outputCid.startsWith('cid:sha256:'));
  assert.ok(result.dagRootCid.startsWith('cid:sha256:'));
});

test('executeFlow: kv reducer', () => {
  const flow = {
    reducer: 'core/kv',
    initialState: {},
    events: [
      { type: 'set', key: 'name', value: 'alice' },
      { type: 'set', key: 'age', value: 30 },
      { type: 'del', key: 'age' }
    ]
  };
  
  const result = executeFlow(flow);
  
  assert.deepStrictEqual(result.finalState, { name: 'alice' });
});

test('executeFlow: list reducer', () => {
  const flow = {
    reducer: 'core/list',
    initialState: [],
    events: [
      { type: 'push', value: 'first' },
      { type: 'push', value: 'second' },
      { type: 'insert', index: 0, value: 'zero' }
    ]
  };
  
  const result = executeFlow(flow);
  
  assert.deepStrictEqual(result.finalState, ['zero', 'first', 'second']);
});

test('executeFlow: ledger reducer', () => {
  const flow = {
    reducer: 'core/ledger',
    initialState: { entries: [] },
    events: [
      { type: 'entry', id: 'tx1', entryType: 'credit', amount: 100 },
      { type: 'entry', id: 'tx2', entryType: 'debit', amount: -30 }
    ]
  };
  
  const result = executeFlow(flow);
  
  assert.strictEqual(result.finalState.entries.length, 2);
  assert.strictEqual(result.finalState.entries[1].balance, 70);
});

test('executeFlow: deterministic execution', () => {
  const flow = {
    reducer: 'core/sum',
    initialState: 0,
    events: [
      { type: 'add', amount: 1 },
      { type: 'add', amount: 2 }
    ]
  };
  
  const result1 = executeFlow(flow);
  const result2 = executeFlow(flow);
  
  // Same execution should produce same CIDs
  assert.strictEqual(result1.inputCid, result2.inputCid);
  assert.strictEqual(result1.outputCid, result2.outputCid);
  assert.strictEqual(result1.dagRootCid, result2.dagRootCid);
});

test('executeFlow: rejects undefined return', () => {
  const flow = {
    reducer: 'core/sum',
    initialState: 0,
    events: [
      { type: 'invalid' }
    ]
  };
  
  assert.throws(() => executeFlow(flow), err => {
    return err.code === 'REDUCER_ERROR';
  });
});

test('generateProof: proof structure', () => {
  const flow = {
    reducer: 'core/sum',
    initialState: 0,
    events: [{ type: 'add', amount: 5 }]
  };
  
  const result = executeFlow(flow);
  const proof = generateProof(result);
  
  assert.strictEqual(proof.v, 1);
  assert.strictEqual(proof.inputCid, result.inputCid);
  assert.strictEqual(proof.outputCid, result.outputCid);
  assert.strictEqual(proof.dagSize, 2);
  assert.ok(Array.isArray(proof.dagLeaves));
});
