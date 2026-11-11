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
// Native query test script.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const path = require('node:path');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const koffi = require('koffi');
if (!process.env.XEDITLIB_PATH || !process.env.GAME_PATH) throw new Error('Set XEDITLIB_PATH and GAME_PATH');
// The wrapper binds this export but exposes no public method for it.
const conflict = koffi.load(process.env.XEDITLIB_PATH).func('uint16 GetConflictData(uint, uint, void*, void*)');
const order = ['Fixture.esm', 'First.esp', 'Second.esp', 'Light.esp'];
function sorted(v) {
  if (Array.isArray(v)) return v.map(sorted);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])]));
  return v;
}
const hex = h => x.getFormID(h).toString(16).toUpperCase().padStart(8, '0');
const identity = h => ({ file: x.name(x.getElementFile(h)), formId: hex(h) });
let initialized = false;
(async () => {
  try {
    x.init(); initialized = true; x.setLanguage('English');
    x.setGamePath(process.env.GAME_PATH);
    x.setBackupPath(path.join(__dirname, 'runtime', 'backups') + path.sep);
    x.setGameMode(4); x.loadPlugins(order.join('\n'), false, false); await x.waitForLoader(30000);
    const files = order.map(name => {
      const h = x.fileByName(name);
      if (!h) throw new Error('Missing loaded fixture: ' + name);
      const records = x.getRecords(h, '', true).map(r => {
        const master = x.getMasterRecord(r);
        const chain = [master, ...x.getOverrides(master)].map(identity);
        const a = Buffer.alloc(1), b = Buffer.alloc(1);
        if (!conflict(0, r, a, b)) throw new Error('GetConflictData: ' + x.getExceptionMessage());
        return { formId: hex(r), signature: x.signature(r), chain,
          winner: identity(x.getWinningOverride(r)), isOverride: x.isOverride(r),
          isWinningOverride: x.isWinningOverride(r), conflict: { all: a[0], this: b[0] },
          element: JSON.parse(x.elementToJson(r)) };
      }).sort((a, b) => a.formId.localeCompare(b.formId));
      return { name, loadOrder: x.getFileLoadOrder(h), masters: x.getMasterNames(h),
        recordCount: x.getRecordCount(h), overrideCount: x.getOverrideRecordCount(h), records };
    });
    const result = { schema: 1, loadOrder: files.map(f => ({ name: f.name, index: f.loadOrder })),
      files: files.sort((a, b) => a.name.localeCompare(b.name)) };
    process.stdout.write(JSON.stringify(sorted(result), null, 2) + '\n');
    console.error('RESULT: QUERY PASS');
  } finally { if (initialized) x.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
