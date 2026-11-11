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
// Group (a): write path. Everything happens in memory on a fresh fixture copy;
// the two saved plugins are hashed, hex-dumped, reloaded and re-serialised.
const { run } = require('./common.cjs');
run('write', {}, async ({ x, step, stepAsync, data, path, fileInfo, hex8, fs }) => {
  const J = h => JSON.parse(x.elementToJson(h));
  const rec = h => ({ formId: hex8(x.getFormID(h)), json: J(h) });
  let w, w2, kywd, book, flst, ovr;
  const savedMain = path.join(data, 'WriteSaved.esp');
  const savedOvr = path.join(data, 'WriteOvr.esp');

  step('01_addFile', () => { w = x.addFile('Write1.esp');
    return { name: x.name(w), loadOrder: x.getFileLoadOrder(w), records: x.getRecordCount(w), masters: x.getMasterNames(w), json: J(w) }; });
  step('02_addFile_duplicate_no_ignore', () => { const h = x.addFile('Write1.esp'); return { name: x.name(h) }; });
  step('03_addFile_duplicate_ignore', () => { const h = x.addFile('Write1.esp', true); return { name: x.name(h) }; });
  step('04_addFile_existing_loaded_plugin', () => { const h = x.addFile('First.esp'); return { name: x.name(h) }; });
  step('05_addMaster', () => { x.addMaster(w, 'Fixture.esm'); return x.getMasterNames(w); });
  step('06_addMaster_duplicate', () => { x.addMaster(w, 'Fixture.esm'); return x.getMasterNames(w); });
  step('07_addMaster_unknown', () => { x.addMaster(w, 'Nope.esm'); return x.getMasterNames(w); });
  step('08_addElement_record', () => { kywd = x.addElement(w, 'KYWD\\KYWD'); x.addElementValue(kywd, 'EDID', 'WriteKywd'); return rec(kywd); });
  step('09_addElement_record_book', () => { book = x.addElement(w, 'BOOK\\BOOK');
    x.addElementValue(book, 'EDID', 'WriteBook'); x.addElementValue(book, 'FULL', 'Write Book'); return rec(book); });
  step('10_setValue_string', () => { x.setValue(book, 'DESC', 'Some text'); return x.getValue(book, 'DESC'); });
  step('11_setValue_enum', () => { x.setValue(book, 'DATA\\Type', 'Note/Scroll'); return { value: x.getValue(book, 'DATA\\Type'), int: x.getIntValue(book, 'DATA\\Type') }; });
  step('12_setIntValue', () => { x.setIntValue(book, 'DATA\\Value', 150); x.setIntValue(book, 'OBND\\X1', -12);
    return { value: x.getIntValue(book, 'DATA\\Value'), x1: x.getIntValue(book, 'OBND\\X1'), valueStr: x.getValue(book, 'DATA\\Value') }; });
  step('13_setUIntValue', () => { x.setUIntValue(book, 'DATA\\Teaches', 7); return { u: x.getUIntValue(book, 'DATA\\Teaches'), s: x.getValue(book, 'DATA\\Teaches') }; });
  step('14_setFloatValue', () => { x.setFloatValue(book, 'DATA\\Weight', 1.5);
    return { f: x.getFloatValue(book, 'DATA\\Weight'), s: x.getValue(book, 'DATA\\Weight') }; });
  step('15_setFlag', () => { x.setFlag(book, 'DATA\\Flags', 'Teaches Spell', true); x.setFlag(book, 'DATA\\Flags', "Can't be Taken", true); x.setFlag(book, 'DATA\\Flags', "Can't be Taken", false);
    return { teaches: x.getFlag(book, 'DATA\\Flags', 'Teaches Spell'), cant: x.getFlag(book, 'DATA\\Flags', "Can't be Taken"), enabled: x.getEnabledFlags(book, 'DATA\\Flags'), all: x.getAllFlags(book, 'DATA\\Flags') }; });
  step('16_setFlag_record_header', () => { x.setFlag(book, 'Record Header\\Record Flags', 'ESM', true); return x.getEnabledFlags(book, 'Record Header\\Record Flags'); });
  step('17_setValue_bad_path', () => x.setValue(book, 'DATA\\Nope', '1'));
  step('18_setIntValue_bad_value_string', () => { x.setValue(book, 'DATA\\Value', 'abc'); return x.getValue(book, 'DATA\\Value'); });
  step('19_addElement_array_container', () => { const h = x.addElement(book, 'KWDA'); return { json: J(book), isSorted: x.isSorted(h) }; });
  step('20_addArrayItem_keywords', () => { x.addArrayItem(book, 'KWDA', '', 'WriteKywd'); x.addArrayItem(book, 'KWDA', '', 'FixtureChain');
    return { json: J(book), has: x.hasArrayItem(book, 'KWDA', '', 'WriteKywd'), hasMissing: x.hasArrayItem(book, 'KWDA', '', 'FixtureUnique') }; });
  step('21_removeArrayItem', () => { x.removeArrayItem(book, 'KWDA', '', 'WriteKywd'); return J(book)['KWDA - Keywords']; });
  step('22_moveArrayItem_sorted_array_error', () => { const h = x.getElement(book, 'KWDA\\[0]'); x.moveArrayItem(h, 1); });
  step('23_flst_array_add_move', () => { flst = x.addElement(w, 'FLST\\FLST'); x.addElementValue(flst, 'EDID', 'WriteList');
    for (const e of ['WriteKywd', 'FixtureChain', 'FixtureUnique']) x.addArrayItem(flst, 'FormIDs', '', e);
    const before = J(flst).FormIDs; x.moveArrayItem(x.getElement(flst, 'FormIDs\\[2]'), -2); const mid = J(flst).FormIDs;
    x.moveArrayItem(x.getElement(flst, 'FormIDs\\[0]'), 1); return { before, mid, after: J(flst).FormIDs }; });
  step('24_flst_move_out_of_range', () => { x.moveArrayItem(x.getElement(flst, 'FormIDs\\[0]'), 10); return J(flst).FormIDs; });
  step('25_flst_removeArrayItem', () => { x.removeArrayItem(flst, 'FormIDs', '', 'FixtureChain'); return J(flst).FormIDs; });
  step('26_removeElement_path', () => { x.removeElement(book, 'DESC'); return { has: x.hasElement(book, 'DESC'), json: J(book) }; });
  step('27_removeElement_missing', () => { x.removeElement(book, 'DESC'); });
  step('28_removeElementOrParent', () => { const h = x.getElement(book, 'KWDA\\[0]'); x.removeElementOrParent(h); return J(book)['KWDA - Keywords'] || null; });
  step('29_copyElement_override_into_same_file', () => { const src = x.getRecords(x.fileByName('First.esp'), '', true)[0];
    ovr = x.copyElement(src, w, false); return { masters: x.getMasterNames(w), rec: rec(ovr), isOverride: x.isOverride(ovr) }; });
  step('30_copyElement_new_record', () => { const src = x.getRecords(x.fileByName('Fixture.esm'), 'BOOK')[0]; const h = x.copyElement(src, w, true);
    return { rec: rec(h), isOverride: x.isOverride(h), isMaster: x.isMaster(h) }; });
  step('31_copyElement_override_into_new_plugin_no_master', () => { w2 = x.addFile('WriteOvr.esp'); const src = x.getRecords(x.fileByName('Second.esp'), '', true)[0];
    const h = x.copyElement(src, w2, false); return { masters: x.getMasterNames(w2), rec: rec(h), overrides: x.getOverrideRecordCount(w2), count: x.getRecordCount(w2) }; });
  step('31b_copyElement_override_after_addMaster', () => { x.addMaster(w2, 'Fixture.esm'); const src = x.getRecords(x.fileByName('Second.esp'), '', true)[0];
    const h = x.copyElement(src, w2, false); return { masters: x.getMasterNames(w2), rec: rec(h), overrides: x.getOverrideRecordCount(w2), count: x.getRecordCount(w2) }; });
  step('32_copyElement_override_twice', () => { const src = x.getRecords(x.fileByName('Second.esp'), '', true)[0]; const h = x.copyElement(src, w2, false);
    return { count: x.getRecordCount(w2), rec: rec(h) }; });
  step('33_copyElement_new_into_plugin_no_master', () => { const src = x.getRecords(x.fileByName('Light.esp'), '')[0]; const h = x.copyElement(src, w2, true);
    return { masters: x.getMasterNames(w2), rec: rec(h) }; });
  step('34_addRequiredMasters', () => { const w3 = x.addFile('WriteReq.esp'); const src = x.getRecords(x.fileByName('First.esp'), '', true)[0];
    x.addRequiredMasters(src, w3, false); return x.getMasterNames(w3); });
  step('35_addMasters_list_and_sort', () => { x.addMasters(w, 'Light.esp\nFirst.esp'); const before = x.getMasterNames(w); x.sortMasters(w); return { before, after: x.getMasterNames(w) }; });
  step('36_cleanMasters', () => { x.cleanMasters(w); return x.getMasterNames(w); });
  step('37_getMasters_requiredBy', () => ({ masters: x.getMasters(w).length, requiredByFixture: x.getRequiredBy(x.fileByName('Fixture.esm')).length }));
  step('38_isModified', () => ({ file: x.getIsModified(w), rec: x.getIsModified(book) }));
  step('39_renameFile', () => { x.renameFile(w, 'WriteMain.esp'); return { name: x.name(w), byName: x.name(x.fileByName('WriteMain.esp')) }; });
  step('40_renameFile_to_existing', () => { x.renameFile(w2, 'First.esp'); return x.name(w2); });
  step('41_saveFile_main', () => { x.saveFile(w, savedMain); return fileInfo(savedMain); });
  step('42_saveFile_override', () => { x.saveFile(w2, savedOvr); return fileInfo(savedOvr); });
  step('43_saveFile_default_path_exists_in_data', () => { const w4 = x.addFile('WriteDefault.esp'); x.addElement(w4, 'KYWD\\KYWD'); x.saveFile(w4, '');
    return { data: fileInfo(path.join(data, 'WriteDefault.esp')) }; });
  step('44_saveFile_bad_dir', () => x.saveFile(w, path.join(data, 'no_such_dir', 'x.esp')));
  step('43b_saveFile_loaded_fixture_roundtrip', () => { x.saveFile(x.fileByName('Fixture.esm'), path.join(data, 'FixtureResaved.esm'));
    const o = fileInfo(path.join(data, 'Fixture.esm')), n = fileInfo(path.join(data, 'FixtureResaved.esm'));
    return { originalSha: o.sha256, resavedSha: n.sha256, sameBytes: o.sha256 === n.sha256, resavedSize: n.size, resavedHex: n.hex }; });
  for (const [id, name] of [['45_reload_main', 'WriteSaved.esp'], ['46_reload_override', 'WriteOvr.esp']]) {
    await stepAsync(id, async () => { x.loadPlugin(name); await x.waitForLoader(30000); const f = x.fileByName(name);
      return { loadOrder: x.getFileLoadOrder(f), masters: x.getMasterNames(f), records: x.getRecordCount(f), overrides: x.getOverrideRecordCount(f), json: J(f) }; });
  }
  step('47_reloaded_records_by_form', () => { const f = x.fileByName('WriteSaved.esp');
    return x.getRecords(f, '', true).map(r => ({ formId: hex8(x.getFormID(r)), sig: x.signature(r), edid: x.getValue(r, 'EDID'), override: x.isOverride(r) })); });
  step('48_late_check_default_path_save', () => ({ data: fileInfo(path.join(data, 'WriteDefault.esp')), saveLeftover: fileInfo(path.join(data, 'WriteDefault.esp.save')), listing: fs.readdirSync(data).sort() }));
});
