/*
Copyright (C) 2026 kxgcayh. All Rights Reserved.
The contents of this file are subject to the Mozilla Public License Version 1.1
(the "License"); you may not use this file except in compliance with the License.
You may obtain a copy at https://www.mozilla.org/MPL/1.1/.
Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
rights and limitations under the License.
The Original Code is the macOS XEditLib port test and build tooling.
The Initial Developer of the Original Code is kxgcayh.
*/
'use strict';
// Verification script for plugin fixture integrity.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const espPath = process.env.XEDITLIB_JS ? (process.env.XEDITLIB_JS.endsWith('.js') ? path.join(path.dirname(process.env.XEDITLIB_JS), 'esp.js') : path.join(process.env.XEDITLIB_JS, 'esp')) : 'xeditlib/esp';
const { parsePlugin } = require(espPath);

const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'reference', 'expected.json'), 'utf8'));
const hashes = {};
for (const f of expected.files) {
  const pth = path.join(__dirname, 'fixtures', 'Data', f.name);
  const b = fs.readFileSync(pth), p = parsePlugin(b);
  assert(b.length < 4096);
  assert.deepEqual(p.masters, f.masters);
  assert.equal([...p.records()].length, f.recordCount);
  hashes[f.name] = crypto.createHash('sha256').update(b).digest('hex');
}
const master = parsePlugin(path.join(__dirname, 'fixtures', 'Data', 'Fixture.esm'));
const bytes = fs.readFileSync(path.join(__dirname, 'fixtures', 'Data', 'Fixture.esm'));
let compressed = false;
for (let p = 0; p < bytes.length;) {
  const sig = bytes.toString('ascii', p, p + 4);
  if (sig !== 'GRUP' && (bytes.readUInt32LE(p + 8) & 0x40000)) compressed = true;
  p += sig === 'GRUP' ? 24 : 24 + bytes.readUInt32LE(p + 4);
}
assert(compressed, 'compressed record absent');
assert([...master.records()].some(r => r.editorId === 'FixtureCompressed' && r.name === 'Compressed fixture'));
assert(fs.readFileSync(path.join(__dirname, 'fixtures', 'Data', 'Fixture.esm')).readUInt32LE(8) & 1, 'ESM flag absent');
assert(fs.readFileSync(path.join(__dirname, 'fixtures', 'Data', 'Light.esp')).readUInt32LE(8) & 0x200, 'ESL flag absent');
const chain = expected.files.find(f => f.name === 'Fixture.esm').records.find(r => r.chain.length === 3);
assert(chain, 'three-deep chain absent');
assert.deepEqual(chain.chain.map(r => r.file), ['Fixture.esm', 'First.esp', 'Second.esp']);
assert.equal(chain.winner.file, 'Second.esp');
assert(!fs.existsSync(path.join(__dirname, 'fixtures', 'Data', 'Skyrim.esm')));
console.log(JSON.stringify({ result: 'PASS', compressed: true, esl: true, threeDeepWinner: chain.winner, hashes }, null, 2));
