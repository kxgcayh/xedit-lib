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
// Hazard group: smashType on a group handle raises an access violation inside the Windows
// DLL. After one access violation the next exception in the same process kills
// the process, so this group holds exactly one such call.
const { run } = require('./common.cjs');
run('hazard_smashtype_group', {}, async ({ x, step }) => {
  const w = x.addFile('Hazard1.esp'); x.addMaster(w, 'Fixture.esm'); x.addElement(w, 'BOOK\\BOOK');
  step('01_smashType_on_group', () => x.smashType(x.getElement(w, 'BOOK')));
  step('99_session_survives', () => ({ fileName: x.name(w), records: x.getRecordCount(w) }));
});
