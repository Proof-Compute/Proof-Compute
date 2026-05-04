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
 * src/kernel/reducers/ledger.js
 * 
 * Ledger reducer for transaction/entry logs
 * State: { entries: [{ id, timestamp, type, amount, balance }, ...] }
 * Events:
 *   { type: 'entry', id: string, entryType: string, amount: number }
 *   { type: 'revert', entryId: string }
 *   { type: 'clear' }
 */

function ledger(state, event) {
  if (!state || typeof state !== 'object' || !Array.isArray(state.entries)) {
    throw new Error('Ledger state must be { entries: [...] }');
  }
  
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be object');
  }
  
  if (event.type === 'entry') {
    if (typeof event.id !== 'string') {
      throw new Error('entry event requires string id');
    }
    if (typeof event.amount !== 'number') {
      throw new Error('entry event requires numeric amount');
    }
    
    const entries = [...state.entries];
    const currentBalance = entries.length > 0
      ? entries[entries.length - 1].balance
      : 0;
    
    const newBalance = currentBalance + event.amount;
    
    entries.push({
      id: event.id,
      entryType: event.entryType || 'transaction',
      amount: event.amount,
      balance: newBalance,
      seq: entries.length
    });
    
    return { ...state, entries };
  }
  
  if (event.type === 'revert') {
    if (typeof event.entryId !== 'string') {
      throw new Error('revert event requires string entryId');
    }
    
    const entries = [...state.entries];
    const idx = entries.findIndex(e => e.id === event.entryId);
    
    if (idx === -1) {
      throw new Error(`Entry ${event.entryId} not found`);
    }
    
    entries.splice(idx, 1);
    
    // Recompute balances
    let balance = 0;
    for (let i = 0; i < entries.length; i++) {
      balance += entries[i].amount;
      entries[i].balance = balance;
      entries[i].seq = i;
    }
    
    return { ...state, entries };
  }
  
  if (event.type === 'clear') {
    return { ...state, entries: [] };
  }
  
  throw new Error(`Unknown event type: ${event.type}`);
}

export { ledger };
