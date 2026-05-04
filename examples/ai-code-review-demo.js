#!/usr/bin/env node

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
 * examples/ai-code-review-demo.js
 *
 * Demonstrates the ai/code-review reducer with executeFlowAsync.
 *
 * Set OLLAMA_HOST/OLLAMA_MODEL if needed (defaults: localhost:11434, llama3).
 * Ollama must be running locally — the proof is still
 * generated and verifiable.
 *
 * Usage:
 */

import { executeFlowAsync, generateProof, verifyExecution } from '../src/index.js';

const flow = {
  reducer: 'ai/code-review',
  initialState: { reviews: [], cacheHits: 0, cacheMisses: 0 },
  events: [
    {
      type: 'review',
      language: 'javascript',
      code: `function fetchUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id;
  return db.run(query);
}`
    },
    {
      type: 'review',
      language: 'javascript',
      code: `const add = (a, b) => a + b;`
    }
  ]
};

console.log('Running AI code review flow...\n');
const result = await executeFlowAsync(flow);

// Print review summaries
for (const review of result.finalState.reviews) {
  console.log(`--- ${review.language} snippet ---`);
  console.log(`Summary: ${review.summary}`);
  if (review.issues?.length) {
    for (const issue of review.issues) {
      const line = issue.line ? ` (line ${issue.line})` : '';
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.type}${line}: ${issue.message}`);
    }
  }
  console.log(`Cached: ${review.cached}\n`);
}

console.log(`Cache hits:   ${result.finalState.cacheHits}`);
console.log(`Cache misses: ${result.finalState.cacheMisses}`);

// Generate & verify proof
const proof = generateProof(result);
const verified = verifyExecution(result, proof);

console.log('\n--- Proof ---');
console.log(`Input CID:  ${result.inputCid.slice(0, 40)}...`);
console.log(`Output CID: ${result.outputCid.slice(0, 40)}...`);
console.log(`DAG root:   ${result.dagRootCid.slice(0, 40)}...`);
console.log(`DAG nodes:  ${result.dag.length}`);
console.log(`Verified:   ${verified ? '✓ PASS' : '✗ FAIL'}`);

// Second run: all responses hit cache — same CIDs guaranteed
console.log('\nRe-running for cache/determinism check...');
const result2 = await executeFlowAsync(flow);
const sameOutput = result.outputCid === result2.outputCid;
console.log(`Same output CID on replay: ${sameOutput ? '✓ deterministic' : '✗ non-deterministic!'}`);
console.log(`Cache hits on replay: ${result2.finalState.cacheHits}`);
