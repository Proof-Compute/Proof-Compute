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


/**
 * examples/client.js
 * 
 * HTTP client for interacting with ProofCompute API
 */

import http from 'http';

const API_URL = 'http://localhost:8787';

/**
 * Make HTTP request
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body, null, 2));
    }
    req.end();
  });
}

/**
 * Pretty print response
 */
function printResponse(title, data) {
  console.log(`\n${title}`);
  console.log('─'.repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     ProofCompute HTTP CLIENT                               ║
║     Server: ${API_URL}                    ║
╚═══════════════════════════════════════════════════════════════╝
`);
  
  try {
    // 1. Get server info
    console.log('1. Fetching server info...');
    const info = await request('GET', '/info');
    printResponse('SERVER INFO', info);
    
    // 2. Execute a flow
    console.log('\n2. Executing deterministic flow...');
    const flowBody = {
      flow: {
        reducer: 'core/sum',
        initialState: 0,
        events: [
          { type: 'add', amount: 10 },
          { type: 'add', amount: 5 },
          { type: 'add', amount: 3 }
        ]
      }
    };
    
    const runResult = await request('POST', '/run', flowBody);
    printResponse('EXECUTION RESULT', runResult);
    
    if (!runResult.ok) {
      console.error('Execution failed:', runResult.error);
      process.exit(1);
    }
    
    const proofCid = runResult.proofCid;
    const inputCid = runResult.inputCid;
    
    // 3. Verify the proof
    console.log('\n3. Verifying proof...');
    const verifyBody = {
      proofCid,
      replay: true
    };
    
    const verifyResult = await request('POST', '/verify', verifyBody);
    printResponse('VERIFICATION RESULT', verifyResult);
    
    // 4. Replay the flow
    console.log('\n4. Replaying stored flow...');
    const replayBody = {
      inputCid
    };
    
    const replayResult = await request('POST', '/replay', replayBody);
    printResponse('REPLAY RESULT', replayResult);
    
    // 5. Verify replay matches original
    console.log('\n5. Cross-Verification Check');
    console.log('─'.repeat(60));
    const outputsMatch = runResult.outputCid === replayResult.outputCid;
    console.log(`Original output CID:  ${runResult.outputCid.slice(0, 35)}...`);
    console.log(`Replayed output CID:  ${replayResult.outputCid.slice(0, 35)}...`);
    console.log(`Match: ${outputsMatch ? '✓ YES' : '✗ NO'}`);
    
    // 6. Try a different flow
    console.log('\n6. Executing different flow (KV store)...');
    const kvFlow = {
      flow: {
        reducer: 'core/kv',
        initialState: {},
        events: [
          { type: 'set', key: 'name', value: 'alice' },
          { type: 'set', key: 'role', value: 'admin' },
          { type: 'set', key: 'active', value: true }
        ]
      }
    };
    
    const kvResult = await request('POST', '/run', kvFlow);
    printResponse('KV EXECUTION RESULT', kvResult);
    
    console.log('\n✓ All tests completed successfully!');
    
  } catch (err) {
    console.error('ERROR:', err.message);
    console.log('\nNote: Make sure the ProofCompute server is running:');
    console.log('  npm start');
    process.exit(1);
  }
}

main();
