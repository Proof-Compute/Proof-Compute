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
import { cidOf, hashOf, hexFromCid, verifyCid, assertCid, CID_PREFIX } from './cid.js';

test('cidOf: deterministic', () => {
  const obj = { b: 2, a: 1 };
  const cid1 = cidOf(obj);
  const cid2 = cidOf(obj);
  
  assert.strictEqual(cid1, cid2);
  assert.ok(cid1.startsWith(CID_PREFIX));
});

test('cidOf: different values have different CIDs', () => {
  const cid1 = cidOf({ a: 1 });
  const cid2 = cidOf({ a: 2 });
  
  assert.notStrictEqual(cid1, cid2);
});

test('hashOf: returns hex string', () => {
  const hash = hashOf({ test: 'data' });
  assert.ok(/^[0-9a-f]{64}$/.test(hash));
});

test('hexFromCid: extracts hash', () => {
  const cid = cidOf({ a: 1 });
  const hex = hexFromCid(cid);
  
  assert.ok(/^[0-9a-f]{64}$/.test(hex));
  assert.strictEqual(cid, CID_PREFIX + hex);
});

test('verifyCid: matches correct CID', () => {
  const data = { x: 42 };
  const cid = cidOf(data);
  
  assert.ok(verifyCid(cid, data));
  assert.ok(!verifyCid(cidOf({ x: 41 }), data));
});

test('assertCid: throws on mismatch', () => {
  const data = { x: 42 };
  const wrongCid = cidOf({ x: 41 });
  
  assert.throws(() => assertCid(wrongCid, data, 'test'));
});

test('cidOf: same content, different order', () => {
  const obj1 = { a: 1, b: 2 };
  const obj2 = { b: 2, a: 1 };
  
  // Should be the same because keys are sorted
  assert.strictEqual(cidOf(obj1), cidOf(obj2));
});
