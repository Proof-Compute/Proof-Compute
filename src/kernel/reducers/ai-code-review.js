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
 * src/kernel/reducers/ai-code-review.js
 *
 * AI Code Review Reducer — local Ollama only, no cloud API.
 *
 * Replay-safe: responses are cached by content hash so
 * re-running the same events never re-calls Ollama.
 *
 * State structure:
 *   { reviews: Array<ReviewRecord>, cacheHits: number, cacheMisses: number }
 *
 * Events:
 *   { type: 'review', code: string, language?: string }
 *
 * Config (env):
 *   OLLAMA_HOST   — default: http://localhost:11434
 *   OLLAMA_MODEL  — default: mistral (also works with llama3.2, codellama, etc.)
 *
 * NOTE: async reducer — use executeFlowAsync(), not executeFlow().
 */

import crypto from 'crypto';

const AI_CACHE = new Map();

async function aiCodeReview(state, event) {
  if (event.type !== 'review') {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  const { code, language = 'javascript' } = event;

  if (!code || typeof code !== 'string') {
    throw new TypeError('Event must have code: string');
  }

  const model = process.env.OLLAMA_MODEL || 'mistral';

  const cacheKey = crypto
    .createHash('sha256')
    .update(JSON.stringify({ code, language, model }))
    .digest('hex');

  let aiResponse;
  let cached = false;

  if (AI_CACHE.has(cacheKey)) {
    aiResponse = AI_CACHE.get(cacheKey);
    cached = true;
  } else {
    aiResponse = await callOllama(code, language, model);
    AI_CACHE.set(cacheKey, aiResponse);
  }

  const review = {
    cacheKey,
    code,
    language,
    model,
    timestamp: Date.now(), // display only — stripped before CID
    cached,
    ...aiResponse
  };

  return {
    reviews: [...(state.reviews || []), review],
    cacheHits:   (state.cacheHits   || 0) + (cached ? 1 : 0),
    cacheMisses: (state.cacheMisses || 0) + (cached ? 0 : 1)
  };
}

async function callOllama(code, language, model) {
  const host = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');

  const prompt = `Review this ${language} code. Find bugs, security issues, and style problems.
Return JSON only — no preamble, no markdown fences:
{
  "issues": [
    {
      "line": <number or null>,
      "severity": "high" | "medium" | "low",
      "type": "bug" | "security" | "performance" | "style",
      "message": "<description>"
    }
  ],
  "summary": "<brief summary>"
}
Code:
\`\`\`${language}
${code}
\`\`\``;

  let response;
  try {
    response = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' })
    });
  } catch (err) {
    throw new Error(`Ollama unreachable at ${host} — is it running? (${err.message})`);
  }

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.response ?? '{}';

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { issues: [], summary: 'Failed to parse Ollama response' };
  }
}

export { aiCodeReview };
