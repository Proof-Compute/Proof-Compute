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
 * src/kernel/reducers/list.js
 * 
 * List reducer for array operations
 * State: [ item, ... ]
 * Events:
 *   { type: 'push', value: any }
 *   { type: 'pop' }
 *   { type: 'insert', index: number, value: any }
 *   { type: 'remove', index: number }
 *   { type: 'clear' }
 */

function list(state, event) {
  if (!Array.isArray(state)) {
    throw new Error(`List reducer state must be array, got: ${typeof state}`);
  }
  
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be object');
  }
  
  if (event.type === 'push') {
    return [...state, event.value];
  }
  
  if (event.type === 'pop') {
    if (state.length === 0) {
      throw new Error('Cannot pop from empty list');
    }
    return state.slice(0, -1);
  }
  
  if (event.type === 'insert') {
    if (typeof event.index !== 'number') {
      throw new Error('insert event requires numeric index');
    }
    const idx = Math.max(0, Math.min(event.index, state.length));
    const next = [...state];
    next.splice(idx, 0, event.value);
    return next;
  }
  
  if (event.type === 'remove') {
    if (typeof event.index !== 'number') {
      throw new Error('remove event requires numeric index');
    }
    if (event.index < 0 || event.index >= state.length) {
      throw new Error(`Index ${event.index} out of bounds`);
    }
    const next = [...state];
    next.splice(event.index, 1);
    return next;
  }
  
  if (event.type === 'clear') {
    return [];
  }
  
  throw new Error(`Unknown event type: ${event.type}`);
}

export { list };
