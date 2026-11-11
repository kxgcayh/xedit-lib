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
// Group (e, localized): the DLL writes a localized plugin (flag 0x80, string IDs in
// FULL/DESC) but never writes the string tables, so the .STRINGS/.DLSTRINGS files are
// hand-built fixtures for the DLL to read (format: count, dataSize, id/offset directory,
// then NUL-terminated strings, or length-prefixed ones for DL/IL tables).
const { run } = require('./common.cjs');
run('localized', { load: [] }, async ({ x, step, stepAsync, data, path, fs, fileInfo, sha256, errMsg, hex8 }) => {
  const J = h => JSON.parse(x.elementToJson(h));
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  const table = (entries, lengthPrefixed) => { const dir = Buffer.alloc(8 * entries.length); const parts = []; let off = 0;
    entries.forEach(([id, text], i) => { const body = Buffer.from(text + '\0', 'latin1'); const rec = lengthPrefixed ? Buffer.concat([(() => { const b = Buffer.alloc(4); b.writeUInt32LE(body.length, 0); return b; })(), body]) : body;
      dir.writeUInt32LE(id, i * 8); dir.writeUInt32LE(off, i * 8 + 4); parts.push(rec); off += rec.length; });
    const head = Buffer.alloc(8); head.writeUInt32LE(entries.length, 0); head.writeUInt32LE(off, 4); return Buffer.concat([head, dir, ...parts]); };

  step('01_write_localized_plugin', () => { const w = x.addFile('LocSrc.esp'); x.setFlag(w, 'File Header\\Record Header\\Record Flags', 'Localized', true);
    const b = x.addElement(w, 'BOOK\\BOOK'); x.addElementValue(b, 'EDID', 'LocBook'); x.addElementValue(b, 'FULL', 'Hello'); x.setValue(b, 'DESC', 'Long description');
    x.saveFile(w, path.join(data, 'LocFix.esp')); return { flags: x.getEnabledFlags(w, 'File Header\\Record Header\\Record Flags'), file: fileInfo(path.join(data, 'LocFix.esp')),
      stringsDirWritten: fs.existsSync(path.join(data, 'Strings')) || fs.existsSync(path.join(path.dirname(data), 'Strings')) }; });
  step('02_hand_built_string_tables', () => { const sd = path.join(data, 'Strings'); fs.mkdirSync(sd, { recursive: true });
    const t = { 'LocFix_English.STRINGS': table([[1, 'Hello localized']], false), 'LocFix_English.DLSTRINGS': table([[2, 'Long localized description']], true), 'LocFix_English.ILSTRINGS': table([], true) };
    const out = {}; for (const [n, b] of Object.entries(t)) { fs.writeFileSync(path.join(sd, n), b); out[n] = { size: b.length, sha256: sha256(b) }; }
    fs.copyFileSync(path.join(data, 'LocFix.esp'), path.join(data, 'LocNoStr.esp')); return out; });
  await stepAsync('03_load_localized_with_strings', async () => { x.loadPlugins('LocFix.esp\nLocNoStr.esp', false, false); await x.waitForLoader(30000);
    const f = x.fileByName('LocFix.esp'); const r = x.getRecords(f, 'BOOK')[0];
    return { flags: x.getEnabledFlags(f, 'File Header\\Record Header\\Record Flags'), full: S(() => x.getValue(r, 'FULL')), desc: S(() => x.getValue(r, 'DESC')), json: J(r), fileJson: J(f) }; });
  step('04_load_localized_without_strings', () => { const f = x.fileByName('LocNoStr.esp'); const r = x.getRecords(f, 'BOOK')[0];
    return { full: S(() => x.getValue(r, 'FULL')), desc: S(() => x.getValue(r, 'DESC')), json: J(r) }; });
  step('05_edit_localized_string', () => { const f = x.fileByName('LocFix.esp'); const r = x.getRecords(f, 'BOOK')[0]; x.setValue(r, 'FULL', 'Edited name');
    return { full: S(() => x.getValue(r, 'FULL')), json: J(r)['FULL - Name'] }; });
  step('06_save_edited_localized', () => { const f = x.fileByName('LocFix.esp'); const p = path.join(data, 'LocEdited.esp'); x.saveFile(f, p);
    return { file: fileInfo(p), strings: fs.existsSync(path.join(data, 'Strings')) ? fs.readdirSync(path.join(data, 'Strings')).sort() : [] }; });
  step('07_language_roundtrip', () => { x.setLanguage('English'); return { lang: S(() => x.getString(len => { if (!x.raw.GetGameLanguage(4, len)) throw new Error('GetGameLanguage failed'); })) }; });
});
