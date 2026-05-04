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
 * src/engine/execute-async.js
 *
 * Async variant of executeFlow for reducers that perform
 * deterministic-but-async work (e.g. cached AI calls).
 *
 * Contract: the reducer MUST be replay-deterministic — same
 * events on the same machine must always yield the same state.
 * The ai-code-review reducer satisfies this by caching every
 * API response by content hash so replays never hit the network.
 *
 * The DAG / proof output is identical in shape to executeFlow,
 * so generateProof / verifyExecution work unchanged.
 */

import { cidOf, hashOf, getReducer, assertCanonical, CanonicalError, merkleRoot } from '../kernel/index.js';

/**
 * Execute an async flow.
 *
 * @param {object} flow  { reducer: string, initialState: any, events: any[] }
 * @returns {Promise<ExecutionResult>}
 */
async function executeFlowAsync(flow) {
  if (!flow || typeof flow !== 'object') {
    throw new Error('Flow must be an object');
  }
  if (typeof flow.reducer !== 'string') {
    throw new Error('Flow must have reducer: string');
  }
  if (!Array.isArray(flow.events)) {
    throw new Error('Flow must have events: array');
  }

  const reducer = getReducer(flow.reducer);

  const dag = [];
  let state = flow.initialState;

  const initialStateCid = cidOf(state);
  dag.push({
    seq: 0,
    stateCid: initialStateCid,
    stateHash: hashOf(state),
    eventCid: null,
    eventHash: null,
    prevStateCid: null
  });

  for (let i = 0; i < flow.events.length; i++) {
    const event = flow.events[i];
    const eventCid = cidOf(event);
    const eventHash = hashOf(event);
    const prevStateCid = dag[dag.length - 1].stateCid;

    // Await in case the reducer is async; sync reducers resolve immediately.
    let nextState;
    try {
      nextState = await reducer(state, event);
    } catch (err) {
      throw Object.assign(
        new Error(`Reducer "${flow.reducer}" threw on event[${i}]: ${err.message}`),
        {
          category: 'execution',
          code: 'REDUCER_ERROR',
          eventIndex: i,
          eventType: event.type,
          cause: err
        }
      );
    }

    if (nextState === undefined || (nextState === null && state !== null)) {
      throw Object.assign(
        new Error(
          `Reducer "${flow.reducer}" returned ${nextState} for event[${i}]. Reducers must return state.`
        ),
        { category: 'execution', code: 'REDUCER_RETURNED_UNDEFINED', eventIndex: i }
      );
    }

    // Validate canonical output — strip display-only fields before CID
    // (timestamp + cached are display-only; removing them keeps
    //  the proof CID identical across runs).
    const canonicalState = stripDisplayFields(nextState);

    try {
      assertCanonical(canonicalState, `state[${i + 1}]`);
    } catch (e) {
      if (e instanceof CanonicalError) {
        throw Object.assign(
          new Error(
            `Reducer "${flow.reducer}" produced non-canonical state at event[${i}]: ${e.message}`
          ),
          { category: 'execution', code: 'NON_CANONICAL_OUTPUT', path: e.path, eventIndex: i }
        );
      }
      throw e;
    }

    const stateCid  = cidOf(canonicalState);
    const stateHash = hashOf(canonicalState);

    dag.push({ seq: i + 1, stateCid, stateHash, eventCid, eventHash, prevStateCid });

    state = nextState; // keep full state (with timestamp) for next reducer call
  }

  const inputCid    = cidOf(flow);
  const outputCid   = dag[dag.length - 1].stateCid;
  const dagRootCid  = 'cid:sha256:' + merkleRoot(dag.map(n => n.stateHash));

  return { inputCid, outputCid, dagRootCid, dag, finalState: state };
}

/**
 * Remove display-only fields before CID computation.
 * Keeps the proof stable across replay runs.
 *
 * Currently strips `timestamp` from every review record
 * inside the ai-code-review state shape.
 *
 * @param {any} state
 * @returns {any}
 */
function stripDisplayFields(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return state;
  }

  // ai-code-review state: { reviews: [...], cacheHits, cacheMisses }
  // Strip all execution-meta fields before CID computation:
  //   cacheHits / cacheMisses — 0/N on first run, N/0 on replay
  //   timestamp               — changes every run
  //   cached                  — false on first run, true on replay
  if (Array.isArray(state.reviews)) {
    const { cacheHits, cacheMisses, ...contentState } = state; // eslint-disable-line no-unused-vars
    return {
      ...contentState,
      reviews: state.reviews.map(r => {
        const { timestamp, cached, ...rest } = r; // eslint-disable-line no-unused-vars
        return rest;
      })
    };
  }

  return state;
}

export { executeFlowAsync };