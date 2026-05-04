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
 * src/node/server.js
 * 
 * HTTP REST API for proof-native compute.
 * Full real logic - no mocks or simulations.
 */

import http from 'http';
import url from 'url';
import { executeFlow } from '../engine/execute.js';
import { generateProof, isValidProof } from '../engine/proof.js';
import { validateMessage, createMessage } from './messages.js';
import { lockRegistry } from '../kernel/index.js';

const PORT = 8787;

/**
 * Parse JSON body from request
 * @param {http.IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e7) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Create HTTP response
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
function respond(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(body, null, 2));
}

/**
 * Handle POST /run
 * Execute a deterministic flow and return proof
 */
async function handleRun(req, res, store) {
  try {
    const payload = await parseBody(req);
    
    if (!payload.flow) {
      return respond(res, 400, {
        ok: false,
        error: 'Missing flow in request body'
      });
    }
    
    // Execute
    const result = executeFlow(payload.flow);
    
    // Generate proof
    const proof = generateProof(result);
    
    // Store persistently
    store.saveFlow(payload.flow);
    store.saveProof(proof);
    store.saveExecution(result.inputCid, result);
    
    respond(res, 200, {
      ok: true,
      inputCid: result.inputCid,
      outputCid: result.outputCid,
      proofCid: proof.proofCid,
      output: result.finalState,
      dagSize: result.dag.length
    });
  } catch (err) {
    respond(res, 500, {
      ok: false,
      error: err.message,
      code: err.code || 'UNKNOWN',
      category: err.category || 'execution'
    });
  }
}

/**
 * Handle POST /verify
 * Verify a proof and optionally replay execution
 */
async function handleVerify(req, res, store) {
  try {
    const payload = await parseBody(req);
    
    if (!payload.proofCid) {
      return respond(res, 400, {
        ok: false,
        error: 'Missing proofCid in request body'
      });
    }
    
    // Retrieve proof
    const proof = store.getProof(payload.proofCid);
    if (!proof) {
      return respond(res, 404, {
        ok: false,
        error: 'Proof not found'
      });
    }
    
    // Validate structure
    if (!isValidProof(proof)) {
      return respond(res, 400, {
        ok: false,
        error: 'Invalid proof structure'
      });
    }
    
    // If replay requested, retrieve flow and re-execute
    let replayValid = null;
    if (payload.replay && proof.inputCid) {
      const flow = store.getFlow(proof.inputCid);
      if (flow) {
        try {
          const result = executeFlow(flow);
          replayValid = result.outputCid === proof.outputCid &&
                       result.dagRootCid === proof.dagRootCid;
        } catch (e) {
          replayValid = false;
        }
      }
    }
    
    respond(res, 200, {
      ok: true,
      valid: isValidProof(proof),
      proofCid: payload.proofCid,
      inputCid: proof.inputCid,
      outputCid: proof.outputCid,
      dagRootCid: proof.dagRootCid,
      eventCount: proof.dagSize - 1,
      replayValid
    });
  } catch (err) {
    respond(res, 500, {
      ok: false,
      error: err.message
    });
  }
}

/**
 * Handle POST /replay
 * Re-execute a stored flow
 */
async function handleReplay(req, res, store) {
  try {
    const payload = await parseBody(req);
    
    if (!payload.inputCid) {
      return respond(res, 400, {
        ok: false,
        error: 'Missing inputCid in request body'
      });
    }
    
    const flow = store.getFlow(payload.inputCid);
    if (!flow) {
      return respond(res, 404, {
        ok: false,
        error: 'Flow not found'
      });
    }
    
    // Re-execute
    const result = executeFlow(flow);
    
    respond(res, 200, {
      ok: true,
      inputCid: result.inputCid,
      outputCid: result.outputCid,
      dagRootCid: result.dagRootCid,
      dagSize: result.dag.length,
      output: result.finalState
    });
  } catch (err) {
    respond(res, 500, {
      ok: false,
      error: err.message
    });
  }
}

/**
 * Handle GET /info
 * Return node info
 */
function handleInfo(res) {
  respond(res, 200, {
    ok: true,
    node: 'proof-compute',
    version: '1.0.0',
    protocol: 'proof-compute-v1',
    features: [
      'deterministic-execution',
      'portable-proofs',
      'event-sourcing',
      'full-replay',
      'merkle-validation'
    ]
  });
}

/**
 * Create HTTP server
 * @param {Store} store
 * @returns {http.Server}
 */
function createServer(store) {
  // Lock reducer registry at startup
  lockRegistry();
  
  return http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    
    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
    
    try {
      if (pathname === '/info' && method === 'GET') {
        handleInfo(res);
      } else if (pathname === '/run' && method === 'POST') {
        await handleRun(req, res, store);
      } else if (pathname === '/verify' && method === 'POST') {
        await handleVerify(req, res, store);
      } else if (pathname === '/replay' && method === 'POST') {
        await handleReplay(req, res, store);
      } else {
        respond(res, 404, {
          ok: false,
          error: 'Not found'
        });
      }
    } catch (err) {
      respond(res, 500, {
        ok: false,
        error: 'Internal server error',
        message: err.message
      });
    }
  });
}

export { createServer };
