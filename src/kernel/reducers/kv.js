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
 * src/kernel/reducers/kv.js
 * 
 * Key-value reducer for simple CRUD
 * State: { key: value, ... } (plain object)
 * Events:
 *   { type: 'set', key: string, value: any }
 *   { type: 'del', key: string }
 *   { type: 'clear' }
 */

function kv(state, event) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error(`KV reducer state must be plain object, got: ${typeof state}`);
  }
  
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be object');
  }
  
  if (event.type === 'set') {
    if (typeof event.key !== 'string') {
      throw new Error('set event requires string key');
    }
    return {
      ...state,
      [event.key]: event.value
    };
  }
  
  if (event.type === 'del') {
    if (typeof event.key !== 'string') {
      throw new Error('del event requires string key');
    }
    const next = { ...state };
    delete next[event.key];
    return next;
  }
  
  if (event.type === 'clear') {
    return {};
  }
  
  throw new Error(`Unknown event type: ${event.type}`);
}

export { kv };
