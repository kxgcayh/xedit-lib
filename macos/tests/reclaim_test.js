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
// Container reset and reference reclamation test:
// 1. Proves that parent container resets and is reclaimed after its last external child handle is released.
// 2. Proves that repeated load/walk/release cycles do not leak container references.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');

const fixturesDir = path.resolve(__dirname, '../ref/fixtures');

async function testXelibReclaimCycles() {
  console.log('Testing xelib repeated load/walk/release cycles on dylib:', process.env.XEDITLIB_PATH);
  x.init();
  try {
    x.setLanguage('English');
    x.setGamePath(fixturesDir);
    x.setGameMode(4); // GM_SSE

    // Run 20 full cycles of loading plugins, walking records and subrecords, releasing child handles,
    // releasing parent records, and cleanly unloading plugins.
    const cycleCount = 20;
    for (let c = 0; c < cycleCount; c++) {
      x.loadPlugins(['Fixture.esm', 'First.esp'].join('\n'), false, false);
      await x.waitForLoader(15000);

      const fFirst = x.fileByName('First.esp');
      assert(fFirst, `First.esp must be loaded in cycle ${c}`);
      const fFixture = x.fileByName('Fixture.esm');
      assert(fFixture, `Fixture.esm must be loaded in cycle ${c}`);

      // Walk records
      const records = x.getRecords(fFirst, '', true);
      assert(records.length > 0, `First.esp must contain records in cycle ${c}`);

      for (const rec of records) {
        // Walk child elements repeatedly
        for (let step = 0; step < 10; step++) {
          const child = x.getElement(rec, 'EDID');
          assert(child, `Child EDID must be accessible in cycle ${c} step ${step}`);
          const val = x.getValue(child);
          assert.strictEqual(val, 'FixtureFirst', `Value must match FixtureFirst`);
          // Release external child handle
          x.release(child);
        }

        // Release record handle
        x.release(rec);
      }

      // Cleanly unload plugins
      x.unloadPlugin(fFirst);
      x.unloadPlugin(fFixture);
    }

    console.log(`OK: ${cycleCount} load/walk/release cycles completed cleanly with no reference leakage.`);
  } finally {
    x.close();
  }
}

function runPascalReclaimProof() {
  const binPath = path.resolve(__dirname, 'test_reclaim_units');
  if (!fs.existsSync(binPath)) {
    console.log('Building test_reclaim_units...');
    const repoRoot = path.resolve(__dirname, '../..');
    const unitsDir = path.resolve(repoRoot, 'macos/out/libs_units/reclaim');
    fs.mkdirSync(unitsDir, { recursive: true });
    const fpc = process.env.FPC || '/opt/homebrew/bin/fpc';
    execFileSync(fpc, [
      '-Sa', '-gl', '-Mdelphiunicode', '-dWIN64',
      '-Fumacos/shim', '-Fulib/xedit', '-Fulib/xedit/zlib', '-Fulib/xedit/lz4',
      '-Fu/opt/homebrew/lib/fpc/3.2.2/units/aarch64-darwin/paszlib',
      '-Fusrc', '-Fulib/Imaging', '-Fulib/Imaging/ZLib', '-Filib/Imaging',
      '-Fulib/Argo', '-Fulib/mte', '-Fulib/TForge', '-Fulib/BSArch',
      '-FE' + __dirname, '-FU' + unitsDir,
      path.join(__dirname, 'test_reclaim_units.pas')
    ], { cwd: repoRoot, stdio: 'inherit' });
  }
  console.log('Running Pascal container reset & reference reclamation proof...');
  const out = execFileSync(binPath, [], { encoding: 'utf8' });
  process.stdout.write(out);
  assert(out.includes('ALL RECLAIM PASCAL UNIT TESTS PASSED'), 'Pascal test must pass');
  console.log('OK: Pascal container reset & reference reclamation proof verified.');
}

(async () => {
  // 1. Run Pascal container proof
  runPascalReclaimProof();

  // 2. Run JS dylib cycles test
  await testXelibReclaimCycles();

  console.log('ALL RECLAIM TESTS PASSED');
})().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
