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
// Round trip: ElementToJson -> ElementFromJson on a scratch copy of the ref fixtures.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const src = path.resolve(__dirname, '../ref/fixtures');
const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-rt-'));
fs.cpSync(src, dst, { recursive: true });
(async () => {
  x.init();
  try {
    x.setLanguage('English'); x.setGamePath(dst); x.setBackupPath(path.join(dst, 'bk') + path.sep);
    x.setGameMode(4);
    x.loadPlugins(['Fixture.esm', 'First.esp', 'Second.esp'].join('\n'), false, false);
    await x.waitForLoader(30000);
    const f = x.fileByName('First.esp');
    const rec = x.getRecords(f, '', true)[0];
    const fid = x.getFormID(rec);
    const j = JSON.parse(x.elementToJson(rec));

    // (1) export still emits File:hex6
    assert.strictEqual(j['Record Header'].FormID, 'First.esp:000800');

    // (2) importing a File:hex6 FormID fails (assert the call throws/returns failure
    // and the error text contains "Access violation"; the process must remain usable:
    // a later call on the same file still works)
    assert.throws(
      () => x.elementFromJson(rec, '', JSON.stringify(j)),
      /Access violation/
    );
    assert.strictEqual(x.getValue(rec, 'EDID'), 'FixtureFirst');
    assert.strictEqual(x.getFormID(rec), fid);
    assert.strictEqual(x.getRecordCount(f), 1);

    // (3) importing the same FormID as 8-digit hex succeeds and round-trips to the expected value
    const book = x.addElement(f, 'BOOK\\BOOK');
    const hex8 = fid.toString(16).padStart(8, '0');
    x.elementFromJson(book, '', JSON.stringify({
      'EDID - Editor ID': 'BookWithKeyword',
      'KWDA - Keywords': [hex8]
    }));
    assert.strictEqual(x.getValue(book, 'EDID'), 'BookWithKeyword');
    const bookJson = JSON.parse(x.elementToJson(book));
    assert.deepStrictEqual(bookJson['KWDA - Keywords'], ['First.esp:000800']);
    console.log('OK formid round trip (scratch copy ' + dst + ', nothing saved)');
  } finally { x.close(); }
})().catch(e => { console.error(e.stack); process.exit(1); });
