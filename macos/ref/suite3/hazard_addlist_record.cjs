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
// Hazard group: exactly one call that makes the Windows DLL raise an access
// violation inside the DLL (a second one in the same process kills the process).
// A native build that returns an error here, or crashes, shows up as DIFF/CRASH.
const { run } = require('./common.cjs');
run('hazard_addlist_record', {}, async ({ x, step, hex8 }) => {
  const w = x.addFile('Hazard1.esp'); x.addMaster(w, 'Fixture.esm');
  const bookJson = (fid) => ({ 'Record Header': { Signature: 'KYWD', FormID: fid }, 'EDID - Editor ID': 'HazardKywd' });
  step('01_GetAddList_on_record', () => { const r = x.addElement(w, 'BOOK\\BOOK'); return x.getAddList(r); });
  step('99_session_survives', () => ({ records: x.getRecordCount(w), fileName: x.name(w), masters: x.getMasterNames(w) }));
});
