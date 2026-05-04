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
 * src/engine/proof.js
 * 
 * Proof generation and verification.
 * A proof is a portable, verifiable summary of execution.
 */

import { cidOf } from '../kernel/index.js';

/**
 * Generate proof from execution result
 * @param {ExecutionResult} result - from executeFlow
 * @returns {Proof}
 */
function generateProof(result) {
  return {
    v: 1,
    inputCid: result.inputCid,
    outputCid: result.outputCid,
    dagRootCid: result.dagRootCid,
    dagSize: result.dag.length,
    dagLeaves: result.dag.map(node => ({
      seq: node.seq,
      stateCid: node.stateCid,
      stateHash: node.stateHash,
      eventCid: node.eventCid,
      eventHash: node.eventHash,
      prevStateCid: node.prevStateCid
    }))
  };
}

/**
 * Verify proof is well-formed
 * @param {Proof} proof
 * @returns {boolean}
 */
function isValidProof(proof) {
  if (!proof || typeof proof !== 'object') return false;
  
  const required = ['v', 'inputCid', 'outputCid', 'dagRootCid', 'dagSize'];
  for (const field of required) {
    if (!(field in proof)) return false;
  }
  
  if (proof.v !== 1) return false;
  if (typeof proof.dagSize !== 'number') return false;
  if (!Array.isArray(proof.dagLeaves)) return false;
  
  return true;
}

/**
 * Reconstruct execution result from proof for replay
 * Useful for: auditing, cross-verification, offline validation
 * 
 * @param {Proof} proof
 * @returns {object} Proof metadata for verification
 */
function proofMetadata(proof) {
  if (!isValidProof(proof)) {
    throw new Error('Invalid proof');
  }
  
  return {
    inputCid: proof.inputCid,
    outputCid: proof.outputCid,
    dagRootCid: proof.dagRootCid,
    eventCount: proof.dagSize - 1,
    proofCid: cidOf(proof)
  };
}

export {
  generateProof,
  isValidProof,
  proofMetadata
};
