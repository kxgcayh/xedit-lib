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
// Group (f, lifecycle): UnloadPlugin success path, reload, NukeFile on a loaded file.
const { run } = require('./common.cjs');
run('lifecycle', {}, async ({ x, step, stepAsync, errMsg }) => {
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  const names = () => [0, 1, 2, 3, 4, 5].map(i => S(() => x.name(x.fileByIndex(i))));
  step('01_initial', () => ({ names: names(), loaderStatus: x.getLoaderStatus() }));
  step('02_unload_last_plugin', () => { const light = x.fileByName('Light.esp'); x.unloadPlugin(light); return { names: names(), byName: S(() => x.name(x.fileByName('Light.esp'))), handleAfter: S(() => x.name(light)) }; });
  step('03_unload_non_last_plugin', () => { x.unloadPlugin(x.fileByName('First.esp')); return names(); });
  await stepAsync('04_reload_unloaded', async () => { x.loadPlugin('Light.esp'); await x.waitForLoader(30000); return { names: names(), loadOrder: S(() => x.getFileLoadOrder(x.fileByName('Light.esp'))), records: S(() => x.getRecordCount(x.fileByName('Light.esp'))) }; });
  step('05_nuke_loaded_last', () => { const light = x.fileByName('Light.esp'); x.nukeFile(light); return { names: names(), byName: S(() => x.name(x.fileByName('Light.esp'))) }; });
  step('06_nuke_loaded_middle', () => { x.nukeFile(x.fileByName('First.esp')); return { names: names(), secondLoadOrder: S(() => x.getFileLoadOrder(x.fileByName('Second.esp'))), secondMasters: S(() => x.getMasterNames(x.fileByName('Second.esp'))) }; });
  step('07_records_after_nuke', () => ({ second: S(() => x.getRecordCount(x.fileByName('Second.esp'))), chain: S(() => x.getOverrides(x.getRecords(x.fileByName('Fixture.esm'), 'KYWD')[0]).length) }));
  step('08_resetStore_then_lookup', () => { x.resetStore(); return { names: names(), afterReset: S(() => x.name(x.fileByName('Fixture.esm'))) }; });
});
