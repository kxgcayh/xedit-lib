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
// Hazard group: GetElements(sparse=true) on an array returns a handle whose
// Name() call kills the Windows DLL process (silent exit code 5), so this group
// only checks the count and the unrelated GetElements path afterwards.
const { run } = require('./common.cjs');
run('hazard_getelements_sparse_array', {}, async ({ x, step }) => {
  const w = x.addFile('Hazard1.esp'); x.addMaster(w, 'Fixture.esm');
  const book = x.addElement(w, 'BOOK\\BOOK'); x.addElement(book, 'KWDA'); x.addArrayItem(book, 'KWDA', '', 'FixtureChain');
  step('01_GetElements_sparse_array_count', () => x.getElements(book, 'KWDA', false, false, true).length);
  step('02_GetElements_sparse_then_names', () => x.getElements(book, 'KWDA', true, false, true).map(h => x.name(h)));
  step('99_session_survives', () => ({ records: x.getRecordCount(w) }));
});
