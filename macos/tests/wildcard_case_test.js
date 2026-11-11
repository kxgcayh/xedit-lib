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
// Case-insensitive file and string table enumeration test:
// Verifies case-insensitive file matching and loading of mixed-case .esp and lowercase .strings files.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const fs = require('fs');
const path = require('path');
const os = require('os');
const xelib = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');

function makeTable(entries, lengthPrefixed) {
  const dir = Buffer.alloc(8 * entries.length);
  const parts = [];
  let off = 0;
  entries.forEach(([id, text], i) => {
    const body = Buffer.from(text + '\0', 'latin1');
    const rec = lengthPrefixed ? Buffer.concat([(() => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(body.length, 0);
      return b;
    })(), body]) : body;
    dir.writeUInt32LE(id, i * 8);
    dir.writeUInt32LE(off, i * 8 + 4);
    parts.push(rec);
    off += rec.length;
  });
  const head = Buffer.alloc(8);
  head.writeUInt32LE(entries.length, 0);
  head.writeUInt32LE(off, 4);
  return Buffer.concat([head, dir, ...parts]);
}

// 171-byte localized plugin fixture (LocFix.esp) with string IDs 1 (FULL) and 2 (DESC)
const LOCFIX_ESP_HEX =
  '54455334190000008000000000000000000000002c000000484544520c009a99d93f0200000001080000434e414d01000047' +
  '5255507a000000424f4f4b000000000000000000000000424f4f4b4a0000000000000000080000000000002c000000454449' +
  '4408004c6f63426f6f6b004f424e440c0000000000000000000000000046554c4c0400010000004445534304000200000044' +
  '415441100000000000000000000000000000000000';

async function main() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-case-test-'));
  const dataDir = path.join(scratch, 'Data');
  const stringsDir = path.join(dataDir, 'Strings');
  fs.mkdirSync(stringsDir, { recursive: true });

  try {
    const fixturesDir = path.resolve(__dirname, '../ref/fixtures/Data');
    const fixtureEsmSrc = path.join(fixturesDir, 'Fixture.esm');
    const firstEspSrc = path.join(fixturesDir, 'First.esp');
    const secondEspSrc = path.join(fixturesDir, 'Second.esp');

    // Fixture files in Data:
    // Fixture.esm (master)
    // LocFix.esp (localized plugin)
    // UPPER_MIX.ESP (uppercase extension)
    // lower_mix.esp (lowercase extension)
    fs.copyFileSync(fixtureEsmSrc, path.join(dataDir, 'Fixture.esm'));
    fs.writeFileSync(path.join(dataDir, 'LocFix.esp'), Buffer.from(LOCFIX_ESP_HEX, 'hex'));
    fs.copyFileSync(firstEspSrc, path.join(dataDir, 'UPPER_MIX.ESP'));
    fs.copyFileSync(secondEspSrc, path.join(dataDir, 'lower_mix.esp'));

    // Create LOWERCASE .strings, .dlstrings, .ilstrings files
    const strData = makeTable([[1, 'Hello lowercase localized']], false);
    const dlstrData = makeTable([[2, 'Long lowercase description']], true);
    const ilstrData = makeTable([], true);

    fs.writeFileSync(path.join(stringsDir, 'LocFix_English.strings'), strData);
    fs.writeFileSync(path.join(stringsDir, 'LocFix_English.dlstrings'), dlstrData);
    fs.writeFileSync(path.join(stringsDir, 'LocFix_English.ilstrings'), ilstrData);

    console.log('Scratch setup OK at:', scratch);

    // Run xelib test
    xelib.init();
    try {
      xelib.setGamePath(scratch);
      xelib.setGameMode(xelib.GM_SSE);
      xelib.setLanguage('English');

      // 1. Check load order discovery of .ESP and .esp mix
      const loadOrder = xelib.getLoadOrder();
      console.log('Discovered load order:', loadOrder);
      if (!loadOrder.includes('UPPER_MIX.ESP')) {
        throw new Error('UPPER_MIX.ESP not found in load order');
      }
      if (!loadOrder.includes('lower_mix.esp')) {
        throw new Error('lower_mix.esp not found in load order');
      }
      if (!loadOrder.includes('LocFix.esp')) {
        throw new Error('LocFix.esp not found in load order');
      }
      if (!loadOrder.includes('Fixture.esm')) {
        throw new Error('Fixture.esm not found in load order');
      }
      console.log('OK: .ESP / .esp mix discovered by AddMissingFiles');

      // 2. Load plugins and verify lowercase strings are read
      xelib.loadPlugins('Fixture.esm\nLocFix.esp\nUPPER_MIX.ESP\nlower_mix.esp', false, false);
      await xelib.waitForLoader(15000);

      const fLoc = xelib.fileByName('LocFix.esp');
      if (!fLoc) throw new Error('LocFix.esp not loaded');

      const fUpper = xelib.fileByName('UPPER_MIX.ESP');
      if (!fUpper) throw new Error('UPPER_MIX.ESP not loaded');

      const fLower = xelib.fileByName('lower_mix.esp');
      if (!fLower) throw new Error('lower_mix.esp not loaded');

      const bookRec = xelib.getRecords(fLoc, 'BOOK')[0];
      if (!bookRec) throw new Error('BOOK record not found in LocFix.esp');

      const fullName = xelib.getValue(bookRec, 'FULL');
      const descText = xelib.getValue(bookRec, 'DESC');

      console.log('FULL:', JSON.stringify(fullName));
      console.log('DESC:', JSON.stringify(descText));

      if (fullName !== 'Hello lowercase localized') {
        throw new Error('Expected "Hello lowercase localized" from .strings, got: ' + fullName);
      }
      if (descText !== 'Long lowercase description') {
        throw new Error('Expected "Long lowercase description" from .dlstrings, got: ' + descText);
      }
      console.log('OK: lowercase .strings and .dlstrings loaded successfully');

      console.log('ALL WILDCARD CASE TESTS PASSED');
    } catch (err) {
      console.error('Loader messages:\n' + xelib.getMessages());
      throw err;
    } finally {
      xelib.close();
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
