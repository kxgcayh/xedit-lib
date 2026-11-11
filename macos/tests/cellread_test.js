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
// Exterior CELL (WRLD child) overridden by Update.esm exposes its subrecords.
// Opt-in test requiring real masters: only runs when REAL_STAGE is set; exits 77 when skipped.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt (exits 77 when unset)
const fs = require('fs');
const path = require('path');

if (!process.env.REAL_STAGE) {
  console.log('SKIP: REAL_STAGE not set (loading real masters requires explicit opt-in)');
  process.exit(77);
}
const stage = process.env.REAL_STAGE.replace(/\/?$/, '/');
if (!fs.existsSync(path.join(stage, 'Data', 'Update.esm'))) {
  console.log('SKIP: real-stage not present at ' + stage);
  process.exit(77);
}

const xelib = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');

function loadActive(x, pluginsTxt) {
  const p = pluginsTxt || process.env.PLUGINS_TXT;
  const active = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
    .filter(l => l.startsWith('*')).map(l => l.slice(1).trim()).filter(Boolean);
  x.loadPlugins(active.join('\n'), true, false);
}

process.env.GAME_ROOT = stage;
process.env.PLUGINS_TXT = path.join(stage, 'plugins.txt');
xelib.init();
xelib.setLanguage('English');
xelib.setGamePath(stage);
xelib.setGameMode(xelib.GM_SSE);
loadActive(xelib);
xelib.waitForLoader().then(() => {
  const file = xelib.fileByName('Skyrim.esm');
  const want = { '00003D7D': 'BrokenOarGrottoExterior01', '00006F28': 'MorKhazgurExterior', '0000701C': 'POIReach33' };
  let bad = 0;
  for (const [id, edid] of Object.entries(want)) {
    const r = xelib.getElement(file, id);
    const got = xelib.hasElement(r, 'EDID') ? xelib.getValue(r, 'EDID') : null;
    const cnt = xelib.elementCount(r);
    const ok = got === edid && cnt > 1;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'FAIL ') + id + ' edid=' + got + ' elements=' + cnt);
  }
  xelib.close();
  process.exit(bad ? 1 : 0);
});
