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
import { canonical } from './canonical.js';

const CID_PREFIX = 'cid:sha256:';
const CID_VERSION = '1';

/**
 * Compute content identifier of a value
 * CID = 'cid:sha256:' + hex(SHA256(canonical(value)))
 * 
 * @param {unknown} value
 * @returns {string}
 */
function cidOf(value) {
  const json = canonical(value);
  const hash = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
  return CID_PREFIX + hash;
}

/**
 * Compute the raw hash digest
 * @param {unknown} value
 * @returns {string} hex hash
 */
function hashOf(value) {
  const json = canonical(value);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * Extract the hex hash from a CID
 * @param {string} cid
 * @returns {string}
 */
function hexFromCid(cid) {
  if (!cid.startsWith(CID_PREFIX)) {
    throw new Error(`Invalid CID format: ${cid}`);
  }
  return cid.slice(CID_PREFIX.length);
}

/**
 * Verify a CID matches a value
 * @param {string} cid
 * @param {unknown} value
 * @returns {boolean}
 */
function verifyCid(cid, value) {
  return cidOf(value) === cid;
}

/**
 * Assert a CID matches a value
 * @param {string} cid
 * @param {unknown} value
 * @param {string} label
 * @throws {Error}
 */
function assertCid(cid, value, label = 'value') {
  const computed = cidOf(value);
  if (computed !== cid) {
    throw new Error(
      `CID mismatch for ${label}\nExpected: ${cid}\nComputed: ${computed}`
    );
  }
}

export {
  cidOf,
  hashOf,
  hexFromCid,
  verifyCid,
  assertCid,
  CID_PREFIX,
  CID_VERSION
};
