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
 * src/kernel/index.js
 * 
 * Public kernel API. Pure deterministic core with NO I/O, NO Date.now(), NO Math.random().
 * Every function here is a pure transformation.
 */

import { canonical, assertCanonical, parseCanonical, CanonicalError } from './canonical.js';
import { cidOf, hashOf, hexFromCid, verifyCid, assertCid, CID_PREFIX } from './cid.js';
import { merkleRoot, merkleProof, verifyMerkleProof } from './merkle.js';
import { 
  registerReducer, 
  getReducer, 
  hasReducer, 
  listReducers, 
  lockRegistry, 
  isLocked 
} from './registry.js';

// Import built-in reducers
import { sum } from './reducers/sum.js';
import { kv } from './reducers/kv.js';
import { list } from './reducers/list.js';
import { ledger } from './reducers/ledger.js';
import { aiCodeReview } from './reducers/ai-code-review.js';

// Register built-in reducers
registerReducer('core/sum', sum);
registerReducer('core/kv', kv);
registerReducer('core/list', list);
registerReducer('core/ledger', ledger);

// Register async / effect reducers
// These require executeFlowAsync() instead of executeFlow()
registerReducer('ai/code-review', aiCodeReview);

export {
  // Canonical JSON
  canonical,
  assertCanonical,
  parseCanonical,
  CanonicalError,
  
  // CIDs
  cidOf,
  hashOf,
  hexFromCid,
  verifyCid,
  assertCid,
  CID_PREFIX,
  
  // Merkle
  merkleRoot,
  merkleProof,
  verifyMerkleProof,
  
  // Reducer registry
  registerReducer,
  getReducer,
  hasReducer,
  listReducers,
  lockRegistry,
  isLocked
};
