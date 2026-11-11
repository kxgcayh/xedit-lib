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
// Stage 1 exit test: node loads the dylib via xeditlib/xelib.js, InitXEdit + GetGlobal('ProgramPath') + a plugin header.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
const path = require('path');
const xelib = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const fx = path.resolve(__dirname, '../ref/fixtures');

function step(name, f) {
  try {
    const r = f();
    console.log('OK  ', name, r === undefined ? '' : JSON.stringify(r));
    return r;
  } catch (e) {
    process.exitCode = 1;
    console.log('FAIL', name, e.message);
    try {
      console.log('  exc:', xelib.getExceptionMessage());
      console.log('  stack:', xelib.getExceptionStack().split('\n').slice(0, 6).join(' | '));
    } catch (_) {}
    return undefined;
  }
}

try {
  step('init', () => xelib.init());
  step('ProgramPath', () => xelib.getGlobal('ProgramPath'));
  step('setGamePath', () => xelib.setGamePath(path.join(fx, '/')));
  step('setGameMode', () => xelib.setGameMode(xelib.GM_SSE));
  const h = step('loadPluginHeader', () => {
    const res = xelib.loadPluginHeader('First.esp');
    if (!res) throw new Error('loadPluginHeader returned falsy handle: ' + res);
    return res;
  });
  step('name', () => {
    if (!h) throw new Error('Cannot get name: header handle is falsy');
    const n = xelib.name(h);
    if (!n) throw new Error('name returned falsy');
    return n;
  });
  step('messages', () => xelib.getMessages());
} finally {
  step('close', () => xelib.close());
}
