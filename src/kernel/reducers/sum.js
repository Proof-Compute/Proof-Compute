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
 * src/kernel/reducers/sum.js
 * 
 * Simple sum reducer for accumulating numbers
 * State: integer value
 * Events: { type: 'add', amount: number }
 */

function sum(state, event) {
  if (typeof state !== 'number') {
    throw new Error(`Sum reducer state must be number, got: ${typeof state}`);
  }
  
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be object');
  }
  
  if (event.type === 'add') {
    if (typeof event.amount !== 'number') {
      throw new Error('add event requires numeric amount');
    }
    return state + event.amount;
  }
  
  if (event.type === 'reset') {
    return 0;
  }
  
  throw new Error(`Unknown event type: ${event.type}`);
}

export { sum };
