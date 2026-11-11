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
// Group (d): plugin error checking and exception message text.
const { run } = require('./common.cjs');
run('errors', {}, async ({ x, step, stepAsync, data, path, fileInfo, hex8, errMsg, norm }) => {
  const J = h => JSON.parse(x.elementToJson(h));
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  // GetErrors returns JSON text; the handle numbers inside are allocator-specific, so they are dropped.
  const errs = () => x.getErrors().map(t => { try { const o = JSON.parse(t); for (const e of o.errors || []) delete e.handle; return o; } catch (e) { return t; } });
  let w;
  step('01_build_unresolved_reference_plugin', () => { w = x.addFile('ErrRef.esp'); x.addMaster(w, 'Fixture.esm');
    const book = x.addElement(w, 'BOOK\\BOOK'); x.addElementValue(book, 'EDID', 'ErrBook'); x.addElement(book, 'KWDA'); x.addArrayItem(book, 'KWDA', '', 'FixtureChain');
    x.addArrayItem(book, 'KWDA', '', 'FixtureUnique'); x.setUIntValue(book, 'KWDA\\[1]', 0x00000999); // no such record in Fixture.esm
    const list = x.addElement(w, 'FLST\\FLST'); x.addElementValue(list, 'EDID', 'ErrList'); x.addArrayItem(list, 'FormIDs', '', 'FixtureChain'); x.setUIntValue(list, 'FormIDs\\[0]', 0x0000A000);
    const itm = x.copyElement(x.getRecords(x.fileByName('First.esp'), '', true)[0], w, false); // identical to the master record
    x.saveFile(w, path.join(data, 'ErrRef.esp'));
    return { book: J(book), list: J(list), itm: J(itm), file: fileInfo(path.join(data, 'ErrRef.esp')).sha256 }; });
  await stepAsync('02_checkForErrors_in_memory_file', async () => { x.checkForErrors(w); let n = 0; while (!x.getErrorThreadDone() && n++ < 200) await new Promise(r => setTimeout(r, 100));
    return { done: x.getErrorThreadDone(), errors: errs() }; });
  step('03_getErrors_again', () => errs());
  await stepAsync('04_checkForErrors_loaded_clean_file', async () => { const f = x.fileByName('Fixture.esm'); x.checkForErrors(f); let n = 0; while (!x.getErrorThreadDone() && n++ < 200) await new Promise(r => setTimeout(r, 100));
    return { done: x.getErrorThreadDone(), errors: errs() }; });
  await stepAsync('05_checkForErrors_reloaded_saved_file', async () => { x.loadPlugin('ErrRef.esp'); await x.waitForLoader(30000); return 'loaded'; });
  step('05b_loaded_name_clash', () => x.name(x.fileByName('ErrRef.esp')));
  await stepAsync('06_checkForErrors_second_override_chain', async () => { const f = x.fileByName('Second.esp'); x.checkForErrors(f); let n = 0; while (!x.getErrorThreadDone() && n++ < 200) await new Promise(r => setTimeout(r, 100));
    return { done: x.getErrorThreadDone(), errors: errs() }; });
  step('07_checkForErrors_on_record', () => { x.checkForErrors(x.getRecords(x.fileByName('Fixture.esm'), 'KYWD')[0]); return x.getErrorThreadDone(); });
  step('08_removeIdenticalRecords', () => { const before = x.getRecordCount(w); x.removeIdenticalRecords(w, true, true); return { before, after: x.getRecordCount(w), overrides: x.getOverrideRecordCount(w) }; });
  step('09_removeIdenticalRecords_no_itm_flag', () => { x.removeIdenticalRecords(w, false, false); return x.getRecordCount(w); });

  // Exception message text of invalid calls (message via the DLL's own channel).
  const viaRaw = (name, call) => { let ok; try { ok = call(); } catch (e) { return { threw: errMsg(e) }; }
    const msg = norm(x.getExceptionMessage()); x.getExceptionStack(); const again = x.getExceptionMessage();
    return { returned: ok, message: msg, messageAfterRead: again }; };
  step('10_exception_getElement_bad_path', () => viaRaw('GetElement', () => x.raw.GetElement(w, x.wcb('NOPE\\NOPE'), Buffer.alloc(4))));
  step('11_exception_fileByName_missing', () => viaRaw('FileByName', () => x.raw.FileByName(x.wcb('Missing.esp'), Buffer.alloc(4))));
  step('12_exception_addElement_bad_signature', () => viaRaw('AddElement', () => x.raw.AddElement(w, x.wcb('ZZZZ\\ZZZZ'), Buffer.alloc(4))));
  step('13_exception_setValue_on_file', () => viaRaw('SetValue', () => x.raw.SetValue(w, x.wcb('NOPE'), x.wcb('1'))));
  step('14_exception_invalid_handle', () => viaRaw('Name', () => x.raw.Name(0x7fffff, Buffer.alloc(4))));
  step('15_exception_released_handle', () => { const f = x.fileByName('First.esp'); const h = x.getRecords(f, '', true)[0]; x.release(h); return viaRaw('Name', () => x.raw.Name(h, Buffer.alloc(4))); });
  step('16_exception_zero_handle', () => viaRaw('GetFormID', () => x.raw.GetFormID(0, Buffer.alloc(4), 0)));
  step('17_exception_getRecord_missing', () => viaRaw('GetRecord', () => x.raw.GetRecord(x.fileByName('Fixture.esm'), 0xABCDEF, 1, Buffer.alloc(4))));
  step('18_exception_setGameMode_bad', () => viaRaw('SetGameMode', () => x.raw.SetGameMode(99)));
  step('20_exception_addMaster_self', () => viaRaw('AddMaster', () => x.raw.AddMaster(w, x.wcb('ErrRef.esp'))));
  step('22_messages', () => { const m = x.getMessages(); x.clearMessages(); return { before: norm(m).split(/\r?\n/).length > 0, after: x.getMessages() }; });
});
