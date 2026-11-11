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
// Container reset and reference reclamation test: releasing child handles allows containers to free decoded subrecords.
// Opt-in (loads real masters): REAL_STAGE=<dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt>. Exit 77 = skipped.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt (exits 77 when unset)
const fs = require('fs'), path = require('path');
const stage = process.env.REAL_STAGE;
if (!stage || !fs.existsSync(path.join(stage, 'Data', 'Skyrim.esm'))) {
  console.log('SKIP reclaim_real_test: REAL_STAGE not set or has no Data/Skyrim.esm');
  process.exit(77);
}
process.env.PLUGINS_TXT = path.join(stage, 'plugins.txt');

const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');

function loadActive(xelib, pluginsTxt) {
  const p = pluginsTxt || process.env.PLUGINS_TXT;
  const active = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
    .filter(l => l.startsWith('*')).map(l => l.slice(1).trim()).filter(Boolean);
  xelib.loadPlugins(active.join('\n'), true, false);
}

const LIMIT_MB = 50;
x.init();
x.setLanguage('English');
x.setGamePath(stage.replace(/\/?$/, '') + path.sep);
x.setGameMode(x.GM_SSE);
loadActive(x);
x.waitForLoader().then(() => {
  const mb = () => Math.round(process.memoryUsage().rss / 1048576);
  const f = x.fileByName('Skyrim.esm');
  const recs = x.getRecords(f, 'NPC_', true).concat(x.getRecords(f, 'CELL', true)).slice(0, 30000);
  const base = mb();
  for (let pass = 0; pass < 2; pass++) for (const r of recs) for (const c of x.getElements(r)) x.release(c);
  const grew = mb() - base;
  x.close();
  if (recs.length < 20000) { console.log('FAIL reclaim_real_test: only ' + recs.length + ' records walked'); process.exit(1); }
  if (grew > LIMIT_MB) { console.log('FAIL reclaim_real_test: RSS grew ' + grew + ' MB over ' + recs.length + ' records (limit ' + LIMIT_MB + ')'); process.exit(1); }
  console.log('OK reclaim_real_test: RSS grew ' + grew + ' MB over ' + recs.length + ' records');
  process.exit(0);
}).catch(e => { console.log('FAIL reclaim_real_test: ' + e.message); process.exit(1); });
