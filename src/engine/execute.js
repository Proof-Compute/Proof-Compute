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
 * src/engine/execute.js
 * 
 * Deterministic flow execution engine:
 *   1. Applies reducer over each event in sequence
 *   2. Records (event, state) pair as DAG node
 *   3. Computes CIDs for input, each state, Merkle root
 *   4. Returns execution result + full DAG
 * 
 * PURE FUNCTION: no I/O, no Date.now(), no Math.random()
 * Same input = same output on every machine
 */

import { cidOf, hashOf, getReducer, assertCanonical, CanonicalError, merkleRoot } from '../kernel/index.js';

/**
 * Execute a deterministic flow
 * @param {object} flow - { reducer: string, initialState: any, events: any[] }
 * @returns {ExecutionResult}
 * @throws on reducer error or non-canonical state
 */
function executeFlow(flow) {
  // Validate flow structure
  if (!flow || typeof flow !== 'object') {
    throw new Error('Flow must be an object');
  }
  
  if (typeof flow.reducer !== 'string') {
    throw new Error('Flow must have reducer: string');
  }
  
  if (!Array.isArray(flow.events)) {
    throw new Error('Flow must have events: array');
  }
  
  // Get reducer function
  const reducer = getReducer(flow.reducer);
  
  // Build DAG
  const dag = [];
  let state = flow.initialState;
  
  // Seq 0: initial state
  const initialStateCid = cidOf(state);
  dag.push({
    seq: 0,
    stateCid: initialStateCid,
    stateHash: hashOf(state),
    eventCid: null,
    eventHash: null,
    prevStateCid: null
  });
  
  // Apply each event
  for (let i = 0; i < flow.events.length; i++) {
    const event = flow.events[i];
    const eventCid = cidOf(event);
    const eventHash = hashOf(event);
    const prevStateCid = dag[dag.length - 1].stateCid;
    
    // Execute reducer (trust boundary)
    let nextState;
    try {
      nextState = reducer(state, event);
    } catch (err) {
      throw Object.assign(
        new Error(
          `Reducer "${flow.reducer}" threw on event[${i}]: ${err.message}`
        ),
        {
          category: 'execution',
          code: 'REDUCER_ERROR',
          eventIndex: i,
          eventType: event.type,
          cause: err
        }
      );
    }
    
    // Validate result
    if (nextState === undefined || (nextState === null && state !== null)) {
      throw Object.assign(
        new Error(
          `Reducer "${flow.reducer}" returned ${nextState} for event[${i}]. Reducers must return state.`
        ),
        {
          category: 'execution',
          code: 'REDUCER_RETURNED_UNDEFINED',
          eventIndex: i
        }
      );
    }
    
    // Validate canonical output
    try {
      assertCanonical(nextState, `state[${i + 1}]`);
    } catch (e) {
      if (e instanceof CanonicalError) {
        throw Object.assign(
          new Error(
            `Reducer "${flow.reducer}" produced non-canonical state at event[${i}]: ${e.message}`
          ),
          {
            category: 'execution',
            code: 'NON_CANONICAL_OUTPUT',
            path: e.path,
            eventIndex: i
          }
        );
      }
      throw e;
    }
    
    // Record in DAG
    const stateCid = cidOf(nextState);
    const stateHash = hashOf(nextState);
    
    dag.push({
      seq: i + 1,
      stateCid,
      stateHash,
      eventCid,
      eventHash,
      prevStateCid
    });
    
    state = nextState;
  }
  
  // Compute aggregate CIDs
  const inputCid = cidOf(flow);
  const outputCid = dag[dag.length - 1].stateCid;
  const dagRootCid = 'cid:sha256:' + merkleRoot(dag.map(n => n.stateHash));
  
  return {
    inputCid,
    outputCid,
    dagRootCid,
    dag,
    finalState: state
  };
}

/**
 * Verify execution result matches a given proof
 * @param {object} result - from executeFlow
 * @param {object} proof - expected proof
 * @returns {boolean}
 */
function verifyExecution(result, proof) {
  if (!result || !proof) return false;
  
  return result.outputCid === proof.outputCid &&
         result.dagRootCid === proof.dagRootCid &&
         result.dag.length === proof.dagSize;
}

export {
  executeFlow,
  verifyExecution
};
