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
// Numeric FormID JSON update test on override records and filename control character validation.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const src = path.resolve(__dirname, '../ref/fixtures');
const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-num-'));
fs.cpSync(src, dst, { recursive: true });

(async () => {
  x.init();
  try {
    x.setLanguage('English');
    x.setGamePath(dst);
    x.setBackupPath(path.join(dst, 'bk') + path.sep);
    x.setGameMode(4);
    x.loadPlugins(['Fixture.esm', 'First.esp', 'Second.esp'].join('\n'), false, false);
    await x.waitForLoader(30000);

    // Numeric JSON FormID update on override record:
    // Load Fixture.esm, First.esp, Second.esp; take First.esp's first override (GetFormID = 0x00000800);
    // import {"Record Header":{"FormID":16779264}} (0x01000800).
    const f = x.fileByName('First.esp');
    const rec = x.getRecords(f, '', true)[0];
    const initialFid = x.getFormID(rec);
    assert.strictEqual(initialFid, 0x00000800, 'Initial override FormID must be 0x00000800');

    // Import numeric FormID: 16779264 = 0x01000800
    x.elementFromJson(rec, '', JSON.stringify({
      'Record Header': {
        'FormID': 16779264
      }
    }));
    const updatedFid = x.getFormID(rec);
    assert.strictEqual(updatedFid, 16779264, 'FormID must update to 16779264 (0x01000800)');
    assert.strictEqual(updatedFid.toString(16).padStart(8, '0'), '01000800', 'Hex FormID must match 01000800');

    // Filename validation rejects control characters (< #32):
    const tempFile = x.addFile('ReviewTemp.esp');
    const invalidNames = [
      'Bad\nName.esp',
      'Bad\rName.esp',
      'Bad\tName.esp',
      'Bad\x01Name.esp',
      'Bad\x1fName.esp'
    ];
    for (const badName of invalidNames) {
      assert.throws(
        () => x.renameFile(tempFile, badName),
        /Filename has invalid characters/,
        `Renaming to ${JSON.stringify(badName)} must fail with invalid characters error`
      );
    }
    assert.strictEqual(x.name(tempFile), 'ReviewTemp.esp', 'Filename must remain unchanged after rejected renames');

    // Verify valid rename still works
    x.renameFile(tempFile, 'ValidName.esp');
    assert.strictEqual(x.name(tempFile), 'ValidName.esp', 'Valid rename must succeed');

    console.log('OK formid numeric update and filename validation passed (scratch copy ' + dst + ')');
  } finally {
    x.close();
    fs.rmSync(dst, { recursive: true, force: true });
  }
})().catch(e => {
  console.error(e.stack);
  process.exit(1);
});
