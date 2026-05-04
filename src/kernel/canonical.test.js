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
import { canonical, assertCanonical, parseCanonical, CanonicalError } from './canonical.js';

test('canonical: primitives', () => {
  assert.strictEqual(canonical(null), 'null');
  assert.strictEqual(canonical(true), 'true');
  assert.strictEqual(canonical(false), 'false');
  assert.strictEqual(canonical(42), '42');
  assert.strictEqual(canonical('hello'), '"hello"');
});

test('canonical: arrays', () => {
  assert.strictEqual(canonical([1, 2, 3]), '[1,2,3]');
  assert.strictEqual(canonical([]), '[]');
  assert.strictEqual(canonical([1, 'two', true]), '[1,"two",true]');
});

test('canonical: objects', () => {
  const obj = { b: 2, a: 1 };
  // Keys must be sorted
  assert.strictEqual(canonical(obj), '{"a":1,"b":2}');
  
  // Nested
  const nested = { z: { b: 2, a: 1 } };
  assert.strictEqual(canonical(nested), '{"z":{"a":1,"b":2}}');
});

test('canonical: rejects non-safe integers', () => {
  assert.throws(() => canonical(Number.MAX_SAFE_INTEGER + 1), CanonicalError);
  assert.throws(() => canonical(Infinity), CanonicalError);
  assert.throws(() => canonical(NaN), CanonicalError);
});

test('canonical: rejects undefined', () => {
  assert.throws(() => canonical(undefined), CanonicalError);
  assert.throws(() => canonical({ key: undefined }), CanonicalError);
});

test('canonical: rejects non-plain objects', () => {
  class MyClass {}
  assert.throws(() => canonical(new MyClass()), CanonicalError);
});

test('assertCanonical: valid values', () => {
  assertCanonical({ a: 1, b: [2, 3] }, 'test');
  assertCanonical(null, 'test');
  // Should not throw
});

test('parseCanonical: valid JSON', () => {
  const obj = parseCanonical('{"a":1,"b":2}');
  assert.deepStrictEqual(obj, { a: 1, b: 2 });
});

test('parseCanonical: rejects invalid', () => {
  assert.throws(() => parseCanonical('{ "a": 1.5 }'), CanonicalError);
});
