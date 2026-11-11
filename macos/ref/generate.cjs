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
// Fixture generation script.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const path = require('node:path');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const apply = process.argv.includes('--apply');
let initialized = false;
try {
  x.init(); initialized = true;
  x.setLanguage('English');
  x.setGamePath(path.join(__dirname, 'fixtures'));
  x.setBackupPath(path.join(__dirname, 'runtime', 'backups') + path.sep);
  x.setGameMode(4);
  console.log('PLAN: Fixture.esm owns two KYWD records and a compressed BOOK; First.esp and Second.esp override the first KYWD; Light.esp owns one ESL record. No Skyrim.esm initially.');
  if (apply) {
    const master = x.addFile('Fixture.esm', true);
    x.setFlag(master, 'File Header\\Record Header\\Record Flags', 'ESM', true);
    const key = x.addElement(master, 'KYWD\\KYWD');
    x.addElementValue(key, 'EDID', 'FixtureChain');
    const lone = x.addElement(master, 'KYWD\\KYWD');
    x.addElementValue(lone, 'EDID', 'FixtureUnique');
    const book = x.addElement(master, 'BOOK\\BOOK');
    x.addElementValue(book, 'EDID', 'FixtureCompressed');
    x.addElementValue(book, 'FULL', 'Compressed fixture');
    x.setUIntValue(book, 'Record Header\\Record Flags', 0x40000);
    const files = [master];
    for (const [name, edid] of [['First.esp', 'FixtureFirst'], ['Second.esp', 'FixtureSecond']]) {
      const f = x.addFile(name, true); x.addMaster(f, 'Fixture.esm');
      const r = x.copyElement(key, f, false); x.addElementValue(r, 'EDID', edid); files.push(f);
    }
    const light = x.addFile('Light.esp', true);
    x.setFlag(light, 'File Header\\Record Header\\Record Flags', 'ESL', true);
    const r = x.addElement(light, 'KYWD\\KYWD'); x.addElementValue(r, 'EDID', 'FixtureLight');
    files.push(light);
    for (const f of files) x.saveFile(f, path.join(__dirname, 'fixtures', 'Data', x.name(f)));
    console.log('RESULT: GENERATE PASS');
  } else console.log('RESULT: DRY RUN PASS (no SaveFile)');
} catch (e) { console.error(e.stack); process.exitCode = 1; }
finally { if (initialized) x.close(); }
