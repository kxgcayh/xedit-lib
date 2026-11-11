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
// Shared helpers for the stage-3 reference suite. No wrapper edits; the public
// xelib.js API plus its exported `raw` bindings are used as-is.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const x = process.env.XEDITLIB_JS ? require(process.env.XEDITLIB_JS) : require('xeditlib');
const koffi = require('koffi');

if (!process.env.XEDITLIB_PATH || !process.env.GAME_PATH) throw new Error('Set XEDITLIB_PATH and GAME_PATH');
const lib = koffi.load(process.env.XEDITLIB_PATH);

// Root = the directory holding fixtures/ (GAME_PATH is <root>/fixtures).
const gameEnv = process.env.GAME_PATH.replace(/[\\/]+$/, '');
const root = path.dirname(gameEnv);
const fixturesData = path.join(gameEnv, 'Data');

// Replace the absolute root (any separator style, optional drive letter) by <ROOT>.
const rootSegs = root.replace(/^[A-Za-z]:/, '').split(/[\\/]+/).filter(Boolean)
  .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const rootRe = new RegExp('(?:[A-Za-z]:)?[\\\\/]+' + rootSegs.join('[\\\\/]+') + '([\\\\/][^\\s"\'<>|*?]*)?', 'gi');
function norm(s) {
  if (typeof s !== 'string') return s;
  return s.replace(rootRe, (m, rest) => '<ROOT>' + (rest || '').replace(/\\/g, '/'));
}
function sorted(v) {
  if (typeof v === 'string') return norm(v);
  if (Array.isArray(v)) return v.map(sorted);
  if (v && typeof v === 'object' && !Buffer.isBuffer(v))
    return Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])]));
  return v;
}
const hex8 = n => (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
function hexDump(buf) {
  const lines = [];
  for (let i = 0; i < buf.length; i += 16) {
    const c = buf.subarray(i, i + 16);
    lines.push(i.toString(16).padStart(6, '0') + '  ' + [...c].map(b => b.toString(16).padStart(2, '0')).join(' ') +
      '  ' + [...c].map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join(''));
  }
  return lines;
}
function fileInfo(p) {
  if (!fs.existsSync(p)) return { exists: false };
  const b = fs.readFileSync(p);
  return { exists: true, size: b.length, sha256: sha256(b), hex: b.length <= 4096 ? hexDump(b) : undefined };
}

// Fresh per-group copy of the fixtures. Only touches <root>/runtime/suite3/<group>.
function freshDir(group) {
  const dir = path.join(root, 'runtime', 'suite3', group);
  if (!/runtime[\\/]suite3[\\/]/.test(dir)) throw new Error('refusing to clean ' + dir);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'Data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'backups'), { recursive: true });
  const names = fs.readdirSync(fixturesData).filter(f => fs.statSync(path.join(fixturesData, f)).isFile()).sort();
  for (const f of names) fs.copyFileSync(path.join(fixturesData, f), path.join(dir, 'Data', f));
  // GetLoadOrder sorts by file time, so give the copies fixed, distinct mtimes.
  const order = ['Fixture.esm', 'First.esp', 'Second.esp', 'Light.esp'];
  names.forEach(f => { const t = 1700000000 + (order.includes(f) ? order.indexOf(f) : 10 + names.indexOf(f)) * 60; fs.utimesSync(path.join(dir, 'Data', f), t, t); });
  return dir;
}

const std = ['Fixture.esm', 'First.esp', 'Second.esp', 'Light.esp'];

// Run `body(ctx)` inside an initialised session; prints sorted JSON on stdout.
function run(group, opts, body) {
  const o = Object.assign({ load: std }, opts);
  (async () => {
    let initialized = false;
    const out = { group, schema: 1, steps: {} };
    try {
      const dir = freshDir(group);
      x.init(); initialized = true;
      x.setLanguage(o.language || 'English');
      x.setGamePath(dir);
      x.setBackupPath(path.join(dir, 'backups') + path.sep);
      x.setGameMode(4);
      if (o.load.length) { x.loadPlugins(o.load.join('\n'), false, false); await x.waitForLoader(30000); }
      const cover = new Set(); if (process.env.SUITE3_COVER) for (const k of Object.keys(x.raw)) { const f = x.raw[k]; x.raw[k] = (...a) => { cover.add(k); return f(...a); }; }
      let skips = []; try { skips = JSON.parse(fs.readFileSync(path.join(__dirname, 'skips_' + group + '.json'), 'utf8')); } catch (e) {}
      const ctx = { x, koffi, lib, dir, data: path.join(dir, 'Data'), out, step, stepAsync,
        hex8, fileInfo, sha256, hexDump, norm, fs, path, root, fixturesData, errMsg, rawStr, rawExc };
      function step(name, fn) {
        if (process.env.SUITE3_TRACE) console.error('TRACE ' + name);
        if (process.env.SUITE3_ONLY && !name.startsWith('00') && !process.env.SUITE3_ONLY.split(',').includes(name.slice(0, 2))) return;
        if (name in out.steps) throw new Error('duplicate step ' + name);
        if (skips.includes(name)) { out.steps[name] = 'SKIPPED_HAZARD'; return; }
        try { const v = fn(ctx); out.steps[name] = v === undefined ? null : v; }
        catch (e) { out.steps[name] = { error: errMsg(e) }; }
        if (process.env.SUITE3_TRACE) console.error('   => ' + JSON.stringify(out.steps[name]).slice(0, 230));
      }
      async function stepAsync(name, fn) {
        if (skips.includes(name)) { out.steps[name] = 'SKIPPED_HAZARD'; return; }
        try { const v = await fn(ctx); out.steps[name] = v === undefined ? null : v; }
        catch (e) { out.steps[name] = { error: errMsg(e) }; }
      }
      await body(ctx);
      if (process.env.SUITE3_COVER) fs.writeFileSync(path.join(process.env.SUITE3_COVER, group + '.json'), JSON.stringify([...cover].sort()));
      process.stdout.write(JSON.stringify(sorted(out), null, 2) + '\n');
      console.error('RESULT: ' + group.toUpperCase() + ' PASS');
    } catch (e) { console.error(e.stack); process.exitCode = 1; }
    finally { if (initialized && !o.noClose) { try { x.close(); } catch (e) {} } }
  })();
}
// Exception text as the DLL reports it. The Delphi stack part (if any) is dropped
// because it is implementation-specific; whether it was empty is not recorded.
function errMsg(e) {
  return norm(String(e.message).split('\n').slice(0, 2).join(' | '))
    .replace(/address [0-9A-Fa-f]{8,16}/g, 'address <ADDR>')
    .replace(/near <[^>]*>/g, 'near <...>');
}
function rawStr(fnName, ...args) {
  return x.getString(len => { if (!x.raw[fnName](...args, len)) throw new Error(fnName + ' returned false'); });
}
function rawExc() { return { message: norm(x.getExceptionMessage()) }; }

module.exports = { run, x, koffi, lib, std, hex8, sorted, norm, fileInfo, root, fixturesData, errMsg };
