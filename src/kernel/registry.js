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
 * src/kernel/registry.js
 * 
 * The reducer registry holds all deterministic reducers.
 * Once locked, no new reducers can be added.
 * In production, lock immediately after bootstrap.
 */

const reducers = new Map();
let locked = false;

/**
 * Register a reducer function
 * @param {string} name
 * @param {Function} fn
 * @throws if locked or name already registered
 */
function registerReducer(name, fn) {
  if (locked) {
    throw new Error(`Reducer registry is locked. Cannot register "${name}"`);
  }
  
  if (typeof fn !== 'function') {
    throw new Error(`Reducer must be a function, got: ${typeof fn}`);
  }
  
  if (reducers.has(name)) {
    throw new Error(`Reducer "${name}" already registered`);
  }
  
  reducers.set(name, fn);
}

/**
 * Get a reducer by name
 * @param {string} name
 * @returns {Function}
 * @throws if not found
 */
function getReducer(name) {
  if (!reducers.has(name)) {
    throw new Error(`Reducer "${name}" not found. Available: ${Array.from(reducers.keys()).join(', ')}`);
  }
  return reducers.get(name);
}

/**
 * Check if reducer exists
 * @param {string} name
 * @returns {boolean}
 */
function hasReducer(name) {
  return reducers.has(name);
}

/**
 * List all registered reducers
 * @returns {string[]}
 */
function listReducers() {
  return Array.from(reducers.keys());
}

/**
 * Lock the registry
 */
function lockRegistry() {
  locked = true;
}

/**
 * Check if locked
 * @returns {boolean}
 */
function isLocked() {
  return locked;
}

export {
  registerReducer,
  getReducer,
  hasReducer,
  listReducers,
  lockRegistry,
  isLocked
};
