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

import crypto from 'crypto';

/**
 * Compute Merkle root of a list of hashes
 * Each level: hash(pair) = SHA256(left + right)
 * Single item: return hash as-is
 * 
 * @param {string[]} hashes - Array of hex hash strings
 * @returns {string} Root hash as hex
 */
function merkleRoot(hashes) {
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('Merkle root requires non-empty array of hashes');
  }
  
  // Ensure all are valid hex strings
  for (const h of hashes) {
    if (typeof h !== 'string' || !/^[0-9a-f]{64}$/.test(h)) {
      throw new Error(`Invalid hash format: ${h}`);
    }
  }
  
  if (hashes.length === 1) {
    return hashes[0];
  }
  
  let level = [...hashes];
  
  while (level.length > 1) {
    const next = [];
    
    // Process pairs
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // Duplicate if odd
      
      const combined = left + right;
      const hash = crypto.createHash('sha256')
        .update(Buffer.from(combined, 'hex'))
        .digest('hex');
      
      next.push(hash);
    }
    
    level = next;
  }
  
  return level[0];
}

/**
 * Compute Merkle proof for a specific item
 * @param {string[]} hashes
 * @param {number} index
 * @returns {object} { root, path, index }
 */
function merkleProof(hashes, index) {
  if (index < 0 || index >= hashes.length) {
    throw new Error(`Index ${index} out of bounds for ${hashes.length} items`);
  }
  
  const root = merkleRoot(hashes);
  const path = [];
  let level = [...hashes];
  let current = index;
  
  while (level.length > 1) {
    const sibling = current % 2 === 0 ? current + 1 : current - 1;
    
    if (sibling < level.length) {
      path.push({
        hash: level[sibling],
        position: sibling % 2 === 0 ? 'left' : 'right'
      });
    }
    
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      const combined = left + right;
      const hash = crypto.createHash('sha256')
        .update(Buffer.from(combined, 'hex'))
        .digest('hex');
      next.push(hash);
    }
    
    current = Math.floor(current / 2);
    level = next;
  }
  
  return {
    root,
    path,
    index,
    leaf: hashes[index]
  };
}

/**
 * Verify a Merkle proof
 * @param {object} proof - { leaf, path, root }
 * @returns {boolean}
 */
function verifyMerkleProof(proof) {
  if (!proof.leaf || !proof.path || !proof.root) {
    return false;
  }
  
  let current = proof.leaf;
  
  for (const step of proof.path) {
    const combined = step.position === 'left'
      ? step.hash + current
      : current + step.hash;
    
    current = crypto.createHash('sha256')
      .update(Buffer.from(combined, 'hex'))
      .digest('hex');
  }
  
  return current === proof.root;
}

export {
  merkleRoot,
  merkleProof,
  verifyMerkleProof
};
