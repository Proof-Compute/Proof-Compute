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

'use strict';

/**
 * src/kernel/canonical.js
 * 
 * Canonical JSON serialization ensures deterministic hashing.
 * Rules:
 *   - No whitespace or formatting
 *   - Keys in alphabetical order
 *   - No undefined values or cycles
 *   - No BigInt, Date, Function, Symbol
 *   - Safe integers only (no Infinity, -Infinity, NaN)
 *   - No floating point precision loss
 */

class CanonicalError extends Error {
  constructor(message, path = []) {
    super(message);
    this.name = 'CanonicalError';
    this.path = path;
  }
}

/**
 * Serialize to canonical JSON
 * @param {unknown} value
 * @param {string[]} path - For error reporting
 * @returns {string}
 */
function canonical(value, path = []) {
  if (value === null) return 'null';
  
  const type = typeof value;
  
  if (type === 'boolean') return value ? 'true' : 'false';
  
  if (type === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalError(`Non-finite number: ${value}`, path);
    }
    if (!Number.isSafeInteger(value)) {
      throw new CanonicalError(`Non-safe integer: ${value}`, path);
    }
    return String(value);
  }
  
  if (type === 'string') {
    return JSON.stringify(value);
  }
  
  if (type === 'object') {
    if (Array.isArray(value)) {
      const items = value.map((v, i) => canonical(v, [...path, String(i)]));
      return '[' + items.join(',') + ']';
    }
    
    // Plain object
    if (Object.getPrototypeOf(value) === Object.prototype || value.constructor === Object) {
      const keys = Object.keys(value).sort();
      const pairs = keys.map(k => {
        if (value[k] === undefined) {
          throw new CanonicalError(`Undefined value at key "${k}"`, [...path, k]);
        }
        return JSON.stringify(k) + ':' + canonical(value[k], [...path, k]);
      });
      return '{' + pairs.join(',') + '}';
    }
    
    throw new CanonicalError(`Non-plain object: ${value.constructor.name}`, path);
  }
  
  throw new CanonicalError(`Cannot serialize type: ${type}`, path);
}

/**
 * Assert that a value is canonical-serializable
 * @param {unknown} value
 * @param {string} label
 * @throws {CanonicalError}
 */
function assertCanonical(value, label = 'value') {
  try {
    canonical(value);
  } catch (e) {
    if (e instanceof CanonicalError) {
      throw new CanonicalError(`${label} is not canonical: ${e.message}`, e.path);
    }
    throw e;
  }
}

/**
 * Parse canonical JSON (always safe)
 * @param {string} json
 * @returns {unknown}
 */
function parseCanonical(json) {
  const value = JSON.parse(json);
  assertCanonical(value, 'parsed JSON');
  return value;
}

export {
  canonical,
  assertCanonical,
  parseCanonical,
  CanonicalError
};
