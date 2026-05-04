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
 * src/node/store.js
 * 
 * Persistent storage for flows, proofs, and execution history.
 * Enables full replay and cross-verification.
 * Uses filesystem (JSON files) — production can replace with SQL, KV, etc.
 */

import fs from 'fs';
import path from 'path';
import { cidOf } from '../kernel/index.js';

class Store {
  constructor(storePath) {
    this.storePath = storePath;
    this.flowsDir = path.join(storePath, 'flows');
    this.proofsDir = path.join(storePath, 'proofs');
    this.executionsDir = path.join(storePath, 'executions');
    
    // Ensure directories exist
    for (const dir of [this.flowsDir, this.proofsDir, this.executionsDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Store a flow
   * @param {object} flow
   * @returns {string} CID
   */
  saveFlow(flow) {
    const cid = cidOf(flow);
    const cidHex = cid.replace('cid:sha256:', '');
    const filepath = path.join(this.flowsDir, `${cidHex}.json`);
    
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, JSON.stringify(flow, null, 2), 'utf8');
    }
    
    return cid;
  }
  
  /**
   * Retrieve a flow by CID
   * @param {string} cid
   * @returns {object|null}
   */
  getFlow(cid) {
    const cidHex = cid.replace('cid:sha256:', '');
    const filepath = path.join(this.flowsDir, `${cidHex}.json`);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }
  
  /**
   * Store a proof
   * @param {object} proof
   * @returns {string} CID
   */
  saveProof(proof) {
    const cid = cidOf(proof);
    const cidHex = cid.replace('cid:sha256:', '');
    const filepath = path.join(this.proofsDir, `${cidHex}.json`);
    
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, JSON.stringify(proof, null, 2), 'utf8');
    }
    
    return cid;
  }
  
  /**
   * Retrieve a proof by CID
   * @param {string} cid
   * @returns {object|null}
   */
  getProof(cid) {
    const cidHex = cid.replace('cid:sha256:', '');
    const filepath = path.join(this.proofsDir, `${cidHex}.json`);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }
  
  /**
   * Store execution record
   * @param {string} inputCid
   * @param {ExecutionResult} result
   * @returns {void}
   */
  saveExecution(inputCid, result) {
    const cidHex = inputCid.replace('cid:sha256:', '');
    const filepath = path.join(this.executionsDir, `${cidHex}.json`);
    
    const record = {
      inputCid: result.inputCid,
      outputCid: result.outputCid,
      dagRootCid: result.dagRootCid,
      dagSize: result.dag.length,
      executedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf8');
  }
  
  /**
   * List all stored CIDs of a type
   * @param {'flows'|'proofs'|'executions'} type
   * @returns {string[]}
   */
  listCids(type) {
    const dir = this[`${type}Dir`];
    if (!fs.existsSync(dir)) return [];
    
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => 'cid:sha256:' + f.replace('.json', ''));
  }
  
  /**
   * Check if CID exists
   * @param {string} cid
   * @param {'flows'|'proofs'} type
   * @returns {boolean}
   */
  has(cid, type) {
    const dir = this[`${type}Dir`];
    const cidHex = cid.replace('cid:sha256:', '');
    const filepath = path.join(dir, `${cidHex}.json`);
    return fs.existsSync(filepath);
  }
}

export { Store };
