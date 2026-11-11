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
// Group (b): ElementFromJson import. Record Header FormID values crash the
// Windows DLL with an access violation, so those inputs live in the hazard_*
// groups; here the FormID is stripped before import (the usable round trip).
const { run } = require('./common.cjs');
run('json', {}, async ({ x, step, stepAsync, data, path, fileInfo, hex8 }) => {
  const J = h => JSON.parse(x.elementToJson(h));
  const clone = o => JSON.parse(JSON.stringify(o));
  const noFid = o => { const c = clone(o); if (c['Record Header']) delete c['Record Header'].FormID; return c; };
  const strip = o => { const c = clone(o); if (c['Record Header']) delete c['Record Header'].FormID; return c; };
  const fx = x.fileByName('Fixture.esm');
  const srcBook = x.getRecords(fx, 'BOOK')[0];
  const srcKywd = x.getRecords(fx, 'KYWD')[0];
  const w = x.addFile('Json1.esp');
  x.addMaster(w, 'Fixture.esm');
  const fresh = p => x.addElement(w, p);

  step('01_roundtrip_book_no_formid', () => { const src = J(srcBook); const r = fresh('BOOK\\BOOK'); x.elementFromJson(r, '', JSON.stringify(noFid(src)));
    const back = J(r); return { src, back, equalIgnoringFormId: JSON.stringify(strip(src)) === JSON.stringify(strip(back)) }; });
  step('02_roundtrip_kywd_no_formid', () => { const src = J(srcKywd); const r = fresh('KYWD\\KYWD'); x.elementFromJson(r, '', JSON.stringify(noFid(src)));
    const back = J(r); return { back, equalIgnoringFormId: JSON.stringify(strip(src)) === JSON.stringify(strip(back)) }; });
  step('03_record_scalar_types', () => { const r = fresh('BOOK\\BOOK');
    x.elementFromJson(r, '', JSON.stringify({ 'EDID - Editor ID': 'JsonBook', 'FULL - Name': 'Json Book', 'OBND - Object Bounds': { X1: -5, Y1: 6, Z1: -7, X2: 8, Y2: 9, Z2: 10 },
      'DATA - Data': { Value: 77, Weight: 2.25, Teaches: 3, Type: 255, Flags: { 'Teaches Spell': true, "Can't be Taken": true } } }));
    return J(r); });
  step('04_subpath_import', () => { const r = x.getRecords(w, 'BOOK')[1]; x.elementFromJson(r, 'DATA', JSON.stringify({ Value: 91 })); return { value: x.getIntValue(r, 'DATA\\Value'), edid: x.getValue(r, 'EDID') }; });
  step('05_flags_replace', () => { const r = x.getRecords(w, 'BOOK')[1]; x.elementFromJson(r, 'DATA', JSON.stringify({ Flags: { 'Teaches Skill': true } })); return x.getEnabledFlags(r, 'DATA\\Flags'); });
  step('06_array_items_hex_formids', () => { const r = fresh('BOOK\\BOOK');
    x.elementFromJson(r, '', JSON.stringify({ 'EDID - Editor ID': 'JsonBookRefs', 'KWDA - Keywords': ['00000800', '00000801'] })); return J(r); });
  step('07_array_items_edid_string_error', () => { const r = fresh('BOOK\\BOOK'); x.elementFromJson(r, '', JSON.stringify({ 'EDID - Editor ID': 'JsonBookEdid', 'KWDA - Keywords': ['FixtureChain'] })); return J(r); });
  step('08_array_items_file_hex6_form_error', () => { const r = fresh('BOOK\\BOOK'); x.elementFromJson(r, '', JSON.stringify({ 'EDID - Editor ID': 'JsonBookF', 'KWDA - Keywords': ['Fixture.esm:000801'] })); return J(r); });
  step('09_roundtrip_exported_ref_form', () => { const src = x.getRecords(w, 'BOOK').find(h => x.getValue(h, 'EDID') === 'JsonBookRefs'); const j = J(src); const r = fresh('BOOK\\BOOK');
    const body = noFid(j); body['EDID - Editor ID'] = 'JsonBookRoundTrip'; x.elementFromJson(r, '', JSON.stringify(body)); return { exportedKeywords: j['KWDA - Keywords'], back: J(r) }; });
  step('10_record_signature_mismatch', () => { const r = fresh('KYWD\\KYWD'); x.elementFromJson(r, '', JSON.stringify({ 'Record Header': { Signature: 'BOOK' }, 'EDID - Editor ID': 'X' })); return J(r); });
  step('11_malformed_json', () => { x.elementFromJson(w, 'KYWD', '{not json'); });
  step('12_empty_object', () => { const r = fresh('KYWD\\KYWD'); x.elementFromJson(r, '', '{}'); return J(r); });
  step('13_unknown_member_key', () => { const r = fresh('KYWD\\KYWD'); x.elementFromJson(r, '', JSON.stringify({ 'ZZZZ - Nope': 1 })); return J(r); });
  step('14_group_records_by_edid', () => { x.elementFromJson(w, 'KYWD', JSON.stringify({ Records: [{ 'EDID - Editor ID': 'JsonGroupKywd' }, { 'EDID - Editor ID': 'JsonGroupKywd2' }] }));
    return x.getRecords(w, 'KYWD').map(h => (x.hasElement(h, 'EDID') ? x.getValue(h, 'EDID') : null)); });
  step('15_group_records_update_existing_by_edid', () => { x.elementFromJson(w, 'KYWD', JSON.stringify({ Records: [{ 'EDID - Editor ID': 'JsonGroupKywd' }] }));
    return x.getRecords(w, 'KYWD').map(h => (x.hasElement(h, 'EDID') ? x.getValue(h, 'EDID') : null)); });
  step('16_file_json_new_file', () => { const w2 = x.addFile('Json2.esp');
    x.elementFromJson(w2, '', JSON.stringify({ 'File Header': { 'Master Files': [{ 'MAST - Filename': 'Fixture.esm' }] }, Groups: { BOOK: [{ 'EDID - Editor ID': 'J2Book', 'DATA - Data': { Value: 3 } }] } }));
    return { masters: x.getMasterNames(w2), json: J(w2) }; });
  step('17_files_json_creates_files', () => { x.elementFromJson(0, '', JSON.stringify({ 'Json3.esp': { 'File Header': { 'Record Header': { 'Record Flags': { ESM: true } } }, Groups: { KYWD: [{ 'EDID - Editor ID': 'J3K' }] } } }));
    return J(x.fileByName('Json3.esp')); });
  step('18_unicode_string_roundtrip', () => { const r = fresh('BOOK\\BOOK'); const s = 'Café Über æøå “q”';
    x.elementFromJson(r, '', JSON.stringify({ 'EDID - Editor ID': 'JsonUnicode', 'FULL - Name': s })); return { value: x.getValue(r, 'FULL'), json: J(r)['FULL - Name'], same: x.getValue(r, 'FULL') === s }; });
  step('19_save_and_hexdump', () => { const p = path.join(data, 'JsonOut.esp'); x.saveFile(w, p); return fileInfo(p); });
  await stepAsync('20_reload_and_dump', async () => { x.loadPlugin('JsonOut.esp'); await x.waitForLoader(30000); const f = x.fileByName('JsonOut.esp');
    return { records: x.getRecordCount(f), masters: x.getMasterNames(f), json: J(f) }; });
});
