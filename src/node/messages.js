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
 * src/node/messages.js
 * 
 * Event-native message envelopes for network transport.
 * Receivers re-execute flow and verify CIDs independently.
 * No trust in sender required — only in the reducer.
 */

import crypto from 'crypto';
import { cidOf } from '../kernel/index.js';
import { canonical } from '../kernel/canonical.js';

/**
 * Derive stable node identity from store path
 * Deterministic: same storePath → same nodeId
 * 
 * @param {string} storePath
 * @returns {{ nodeId: string, secret: Buffer }}
 */
function deriveNodeIdentity(storePath) {
  const secret = crypto.pbkdf2Sync(
    storePath,
    'proof-compute-node-identity-v1',
    10000,
    32,
    'sha256'
  );
  const nodeId = 'proof-compute:node:' + secret.toString('hex').slice(0, 16);
  return { nodeId, secret };
}

/**
 * Create signed message envelope
 * @param {ExecutionResult} result - from executeFlow
 * @param {Proof} proof - from generateProof
 * @param {string} storePath - for deriving node identity
 * @returns {Message}
 */
function createMessage(result, proof, storePath) {
  if (!result || !proof || !storePath) {
    throw new Error('Missing required parameters');
  }
  
  const { nodeId, secret } = deriveNodeIdentity(storePath);
  
  // Message body (canonical fields only)
  const body = {
    v: 1,
    nodeId,
    inputCid: result.inputCid,
    outputCid: result.outputCid,
    proofCid: cidOf(proof)
  };
  
  // Sign stable fields
  const canonicalBody = canonical(body);
  const sig = crypto.createHmac('sha256', secret)
    .update(canonicalBody, 'utf8')
    .digest('hex');
  
  return {
    ...body,
    flow: result.flow,
    proof,
    sig,
    ts: Date.now()  // Metadata only, not signed
  };
}

/**
 * Validate message structure
 * Does NOT verify proof — requires re-execution
 * 
 * @param {Message} msg
 * @returns {{ ok: boolean, diagnostics: object[] }}
 */
function validateMessage(msg) {
  const diagnostics = [];
  
  if (!msg || typeof msg !== 'object') {
    return {
      ok: false,
      diagnostics: [{ check: 'structure', ok: false, message: 'Not an object' }]
    };
  }
  
  if (msg.v !== 1) {
    diagnostics.push({ check: 'version', ok: false, message: `Expected v=1, got: ${msg.v}` });
  }
  
  const cidFields = ['inputCid', 'outputCid', 'proofCid'];
  for (const field of cidFields) {
    if (!msg[field] || !msg[field].startsWith('cid:sha256:')) {
      diagnostics.push({ 
        check: field, 
        ok: false, 
        message: `${field} missing or malformed` 
      });
    }
  }
  
  if (!msg.nodeId || typeof msg.nodeId !== 'string') {
    diagnostics.push({ check: 'nodeId', ok: false, message: 'nodeId missing' });
  }
  
  if (!msg.flow || typeof msg.flow !== 'object') {
    diagnostics.push({ check: 'flow', ok: false, message: 'flow missing' });
  }
  
  if (!msg.proof || typeof msg.proof !== 'object') {
    diagnostics.push({ check: 'proof', ok: false, message: 'proof missing' });
  }
  
  // Verify CIDs match content
  if (msg.flow && msg.inputCid) {
    const computed = cidOf(msg.flow);
    if (computed !== msg.inputCid) {
      diagnostics.push({
        check: 'flow-cid',
        ok: false,
        message: 'Flow CID mismatch',
        expected: msg.inputCid,
        computed
      });
    } else {
      diagnostics.push({ check: 'flow-cid', ok: true });
    }
  }
  
  if (msg.proof && msg.proofCid) {
    const computed = cidOf(msg.proof);
    if (computed !== msg.proofCid) {
      diagnostics.push({
        check: 'proof-cid',
        ok: false,
        message: 'Proof CID mismatch',
        expected: msg.proofCid,
        computed
      });
    } else {
      diagnostics.push({ check: 'proof-cid', ok: true });
    }
  }
  
  const ok = diagnostics.every(d => d.ok);
  return { ok, diagnostics };
}

export {
  deriveNodeIdentity,
  createMessage,
  validateMessage
};
