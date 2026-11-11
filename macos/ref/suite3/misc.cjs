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
// Group (f): every export bound in xelib.js that the other groups do not call,
// each used once with tiny valid input (plus one invalid variant where cheap).
const { run } = require('./common.cjs');
run('misc', {}, async ({ x, step, stepAsync, data, dir, path, fs, fileInfo, errMsg, hex8, norm }) => {
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  const J = h => JSON.parse(x.elementToJson(h));
  const rd = h => (h ? { formId: S(() => hex8(x.getFormID(h))), sig: S(() => x.signature(h)), edid: S(() => x.getValue(h, 'EDID')), file: S(() => x.name(x.getElementFile(h))) } : null);
  const arr = (fn, ...a) => S(() => x.getArray(len => { if (!x.raw[fn](...a, len)) throw new Error(fn + ' failed'); }));
  const str = (fn, ...a) => S(() => x.getString(len => { if (!x.raw[fn](...a, len)) throw new Error(fn + ' failed'); }));
  const fx = x.fileByName('Fixture.esm'), first = x.fileByName('First.esp'), second = x.fileByName('Second.esp'), light = x.fileByName('Light.esp');
  const chain = x.getRecords(fx, 'KYWD')[0], book = x.getRecords(fx, 'BOOK')[0];
  const firstRec = x.getRecords(first, '', true)[0], secondRec = x.getRecords(second, '', true)[0];

  // META
  step('01_GetGlobals', () => { const g = x.getGlobals(); const kv = Object.fromEntries(g.split(/\r?\n/).filter(Boolean).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
    // Machine-specific locations are masked; the data path (under the fixture root) and the rest are kept.
    for (const k of ['ProgramPath', 'AppDataPath', 'MyGamesPath', 'GameIniPath']) if (k in kv) kv[k] = '<MACHINE-SPECIFIC length>0=' + (kv[k].length > 0);
    return { keys: Object.keys(kv).sort(), values: kv }; });
  step('02_GetGlobal', () => ({ version: S(() => x.getGlobal('Version')), programPathNonEmpty: S(() => x.getGlobal('ProgramPath').length > 0), gameName: S(() => x.getGlobal('GameName')), missing: S(() => x.getGlobal('NoSuchKey')) }));
  step('03_SetSortMode', () => { const out = {}; for (const [m, r] of [[0, false], [1, false], [2, false], [3, false], [3, true], [1, true], [4, false]]) out[`${m}/${+r}`] = S(() => { x.setSortMode(m, r); return x.getRecords(fx, 'KYWD').map(h => hex8(x.getFormID(h))); });
    out.elementsByEdid = S(() => { x.setSortMode(2, false); return x.getElements(x.getElement(fx, 'KYWD'), '', true).map(h => x.name(h)); }); x.setSortMode(0, false); return out; });
  step('04_Release_and_use_released', () => { const h = x.getElement(fx, 'KYWD'); const before = x.name(h); x.release(h); return { before, afterNameOnReleased: S(() => x.name(h)) }; });
  step('05_ReleaseNodes_without_nodes', () => S(() => { x.releaseNodes(fx); return null; }));
  step('06_GetDuplicateHandles', () => { const a = x.getElement(fx, 'KYWD'), b = x.getElement(fx, 'KYWD'); return { sameHandle: a === b, dups: S(() => x.getDuplicateHandles(a).length) }; });

  // LOADING / SETUP
  step('08_GetGamePath', () => ({ mode4: S(() => norm(x.getGamePath(4))), mode3: S(() => norm(x.getGamePath(3))), mode0: S(() => norm(x.getGamePath(0))) })); // mode 99 raises an access violation: hazard_getgamepath_badmode
  step('09_GetLoadOrder_and_active', () => ({ loadOrder: S(() => x.getLoadOrder()), active: S(() => x.getActivePlugins()) }));
  step('10_SetGameMode_same_again', () => S(() => { x.setGameMode(4); return null; }));
  step('11_SetBackupPath_SetLanguage_roundtrip', () => ({ backup: S(() => { x.setBackupPath(path.join(dir, 'backups') + path.sep); return null; }), lang: S(() => { x.setLanguage('English'); return null; }), badLang: S(() => { x.setLanguage('Klingon'); return null; }), langBack: S(() => { x.setLanguage('English'); return null; }) }));
  await stepAsync('12_LoadPluginHeader', async () => { const h = x.loadPluginHeader('Second.esp'); return { name: S(() => x.name(h)), masters: S(() => x.getMasterNames(h)), records: S(() => x.getRecordCount(h)), loadOrder: S(() => x.getFileLoadOrder(h)),
    header: S(() => J(h)['File Header']['HEDR - Header']), sameAsLoaded: S(() => h === second) }; });
  step('13_LoadPluginHeader_missing', () => S(() => x.loadPluginHeader('Nope.esp')));
  step('14_GetLoaderStatus', () => x.getLoaderStatus());
  step('15_BuildReferences_and_GetReferencedBy', () => { x.buildReferences(fx, true);
    return { chainRefs: S(() => x.getReferencedBy(chain).length), bookRefs: S(() => x.getReferencedBy(book).length), firstOvr: S(() => x.getReferencedBy(firstRec).length), byEdid: S(() => x.getReferencedBy(chain).map(h => x.getValue(h, 'EDID'))) }; });

  step('15b_GetReferencedBy_with_referencing_record', () => { const w = x.addFile('RefBy.esp'); x.addMaster(w, 'Fixture.esm'); const r = x.addElement(w, 'BOOK\\BOOK'); x.addElementValue(r, 'EDID', 'RefByBook'); x.addElement(r, 'KWDA'); x.addArrayItem(r, 'KWDA', '', 'FixtureChain');
    const o = {}; o.buildFixture = S(() => { x.buildReferences(fx, true); return null; }); o.buildRefBy = S(() => { x.buildReferences(w, true); return null; }); o.buildAsync = S(() => { x.buildReferences(w, false); return 'started'; }); // status is timing dependent; see 15c
    const names = h => S(() => x.getReferencedBy(h).map(q => x.getValue(q, 'EDID'))); o.chain = names(chain); o.unique = names(x.getRecords(fx, 'KYWD')[1]); o.book = names(book); return o; });

  await stepAsync('15c_wait_after_async_build', async () => { await x.waitForLoader(30000); return x.getLoaderStatus(); });

  // FILE HANDLING
  // MD5Hash on a file handle never returns under Wine (infinite loop in the DLL), so it is not called on files.
  step('16_MD5Hash_CRCHash', () => ({ crcFixture: str('CRCHash', fx), crcFirst: str('CRCHash', first), crcLight: str('CRCHash', light), md5Record: str('MD5Hash', chain),
    onDisk: { fixture: fileInfo(path.join(data, 'Fixture.esm')).sha256, first: fileInfo(path.join(data, 'First.esp')).sha256 } }));
  step('17_SortEditorIDs_SortNames', () => { const w = x.addFile('Sort1.esp'); for (const e of ['zz', 'aa', 'mm']) { const r = x.addElement(w, 'KYWD\\KYWD'); x.addElementValue(r, 'EDID', e); }
    const before = x.getRecords(w, 'KYWD').map(h => x.getValue(h, 'EDID')); const a = S(() => { x.raw.SortEditorIDs(w, x.wcb('KYWD')); return x.getRecords(w, 'KYWD').map(h => x.getValue(h, 'EDID')); });
    const b = S(() => { x.raw.SortNames(w, x.wcb('KYWD')); return x.getRecords(w, 'KYWD').map(h => x.getValue(h, 'EDID')); });
    const bad = S(() => { if (!x.raw.SortEditorIDs(w, x.wcb('ZZZZ'))) throw new Error('SortEditorIDs false: ' + x.getExceptionMessage()); return 'ok'; }); return { before, afterEditorIDs: a, afterNames: b, badSignature: bad }; });
  step('18_NukeFile', () => { const w = x.addFile('Nuke1.esp'); x.addElement(w, 'KYWD\\KYWD'); x.nukeFile(w); return { gone: S(() => x.name(x.fileByName('Nuke1.esp'))), handleAfter: S(() => x.name(w)) }; });
  step('21_GetRecordDef_DefToJson', () => { const h = S(() => x.getHandle(r => { if (!x.raw.GetRecordDef(x.wcb('BOOK'), r)) throw new Error('GetRecordDef failed'); }));
    const missing = S(() => x.getHandle(r => { if (!x.raw.GetRecordDef(x.wcb('ZZZZ'), r)) throw new Error('GetRecordDef failed'); })); const asDefs = typeof h === 'number' ? S(() => JSON.parse(x.defToJson(h))) : h;
    return { recordDefJsonKeys: asDefs && asDefs.elements ? { name: asDefs.name, count: asDefs.elements.length, first: asDefs.elements.slice(0, 4) } : asDefs, missing, defToJsonOnElement: S(() => x.defToJson(x.getElement(book, 'DATA'))), defToJsonOnFile: S(() => x.defToJson(fx)) }; });
  step('22_GetEnumOptions_flags', () => { const w = x.addFile('Enum1.esp'); const r = x.addElement(w, 'BOOK\\BOOK');
    return { type: S(() => x.getEnumOptions(r, 'DATA\\Type')), teaches: S(() => x.getEnumOptions(r, 'DATA\\Teaches')), flags: S(() => x.getEnumOptions(r, 'DATA\\Flags')), allFlags: S(() => x.getAllFlags(r, 'DATA\\Flags')), recFlags: S(() => x.getAllFlags(r, 'Record Header\\Record Flags')), notEnum: S(() => x.getEnumOptions(r, 'EDID')) }; });
  step('23_SetEnabledFlags', () => { const w = x.addFile('Flags1.esp'); const r = x.addElement(w, 'BOOK\\BOOK'); const a = S(() => { x.setEnabledFlags(r, 'DATA\\Flags', "Teaches Skill\r\nTeaches Spell"); return x.getEnabledFlags(r, 'DATA\\Flags'); });
    const b = S(() => { x.setEnabledFlags(r, 'DATA\\Flags', "Can't be Taken"); return x.getEnabledFlags(r, 'DATA\\Flags'); }); const c = S(() => { x.setEnabledFlags(r, 'DATA\\Flags', ''); return x.getEnabledFlags(r, 'DATA\\Flags'); });
    const d = S(() => { x.setEnabledFlags(r, 'DATA\\Flags', 'Nope'); return x.getEnabledFlags(r, 'DATA\\Flags'); }); return { a, b, c, d }; });
  step('24_signature_name_maps', () => { const map = x.getSignatureNameMap(); const lines = map.split(/\r?\n/).filter(Boolean).sort();
    return { count: lines.length, sample: lines.slice(0, 8), bookName: S(() => x.nameFromSignature('BOOK')), bookSig: S(() => x.signatureFromName('Book')), sigBadName: S(() => x.signatureFromName('Nope')), nameBadSig: S(() => x.nameFromSignature('ZZZZ')), lower: S(() => x.nameFromSignature('book')), kywd: S(() => x.nameFromSignature('KYWD')) }; });

  // RECORD HANDLING
  step('25_GetFormID_local', () => ({ global: hex8(x.getFormID(chain)), local: hex8(x.getFormID(chain, true)), overrideGlobal: hex8(x.getFormID(secondRec)), overrideLocal: hex8(x.getFormID(secondRec, true)), light: hex8(x.getFormID(x.getRecords(light, 'KYWD')[0])), lightLocal: hex8(x.getFormID(x.getRecords(light, 'KYWD')[0], true)) }));
  step('26_SetFormID', () => { const w = x.addFile('Fid1.esp'); x.addMaster(w, 'Fixture.esm'); const r = x.addElement(w, 'KYWD\\KYWD'); x.addElementValue(r, 'EDID', 'FidKywd'); const holder = x.addElement(w, 'FLST\\FLST'); x.addArrayItem(holder, 'FormIDs', '', 'FidKywd');
    const before = hex8(x.getFormID(r)); const a = S(() => { x.setFormID(r, 0x04000900, false, true); return hex8(x.getFormID(r)); }); const b = S(() => { x.setFormID(r, 0x00000A00, true, true); return [hex8(x.getFormID(r)), hex8(x.getFormID(r, true))]; });
    const c = S(() => { x.setFormID(r, 0x04000800, false, false); return hex8(x.getFormID(r)); }); return { before, a, b, c, ref: J(holder).FormIDs }; });
  step('27_GetREFRs', () => ({ file: S(() => x.getREFRs(fx).length), cellSearch: S(() => x.getREFRs(fx, 'REFR', 0).length), flags: S(() => x.getREFRs(fx, '', 3).length), group: S(() => x.getREFRs(x.getElement(fx, 'KYWD')).length) }));
  step('28_GetOverrides_Master_Previous_Winning', () => ({ chain: S(() => x.getOverrides(chain).map(h => rd(h))), overridesOfOverride: S(() => x.getOverrides(firstRec).length), master: rd(x.getMasterRecord(secondRec)), winning: rd(x.getWinningOverride(chain)), isWinning: [chain, firstRec, secondRec].map(h => x.isWinningOverride(h)),
    previousInFirst: S(() => rd(x.getPreviousOverride(secondRec, first))), previousInFixture: S(() => rd(x.getPreviousOverride(secondRec, fx))), previousOfMaster: S(() => rd(x.getPreviousOverride(chain, fx))), previousLight: S(() => rd(x.getPreviousOverride(secondRec, light))) }));
  step('29_IsInjected_GetInjectionTarget', () => ({ isInjected: x.isInjected(chain), isInjectedOverride: x.isInjected(firstRec), targetHandleNonZero: S(() => x.getInjectionTarget(chain) !== 0) }));
  step('30_FindValidReferences', () => { const w = x.addFile('Ref1.esp'); x.addMaster(w, 'Fixture.esm'); const r = x.addElement(w, 'BOOK\\BOOK'); const item = x.addElement(r, 'KWDA'); x.addArrayItem(r, 'KWDA', '', 'FixtureChain');
    const f = (sig, search, limit) => arr('FindValidReferences', r, x.wcb(sig), x.wcb(search), limit); const names = v => (Array.isArray(v) ? { count: v.length } : v);
    return { kywdAll: names(f('KYWD', '', 10)), kywdSearch: names(f('KYWD', 'Fixture', 10)), kywdLimit1: names(f('KYWD', '', 1)), bookSig: names(f('BOOK', '', 10)), badSig: names(f('ZZZZ', '', 10)), zero: names(f('KYWD', '', 0)) }; });
  step('31_ExchangeReferences', () => { const w = x.addFile('Xchg1.esp'); x.addMaster(w, 'Fixture.esm'); const r = x.addElement(w, 'FLST\\FLST'); x.addElementValue(r, 'EDID', 'XList'); x.addArrayItem(r, 'FormIDs', '', 'FixtureChain');
    const before = J(r).FormIDs; const ok = S(() => { x.exchangeReferences(r, 0x00000800, 0x00000801); return J(r).FormIDs; }); const none = S(() => { x.exchangeReferences(r, 0x00000999, 0x00000801); return J(r).FormIDs; }); return { before, ok, none }; });
  step('32_GetNodes_GetNodeElements', () => { const n = S(() => x.getHandle(h => { if (!x.raw.GetNodes(chain, h)) throw new Error('GetNodes failed'); }));
    const els = typeof n === 'number' ? arr('GetNodeElements', n, chain) : null;
    return { node: typeof n === 'number' ? 'handle' : n, elementCount: Array.isArray(els) ? els.length : els, nonZeroElements: Array.isArray(els) ? els.filter(Boolean).length : null, nodeFile: S(() => typeof x.getHandle(h => { if (!x.raw.GetNodes(fx, h)) throw new Error('GetNodes failed'); })) }; });
  step('33_GetConflictData_new_records', () => { const koffi = require('koffi'); const g = koffi.load(process.env.XEDITLIB_PATH).func('uint16 GetConflictData(uint, uint, void*, void*)'); const o = {};
    for (const [label, h] of [['chain', chain], ['first', firstRec], ['second', secondRec], ['book', book]]) { const a = Buffer.alloc(1), b = Buffer.alloc(1); o[label] = g(0, h, a, b) ? { all: a[0], this: b[0] } : { error: norm(x.getExceptionMessage()) }; } return o; });
  step('07_Switch_handles', () => { const a = x.getRecords(fx, 'KYWD')[0], b = x.getRecords(fx, 'KYWD')[1]; const before = [x.getValue(a, 'EDID'), x.getValue(b, 'EDID')]; const sw = S(() => { x.switchHandles(a, b); return null; });
    return { before, switched: sw, afterA: S(() => x.getValue(a, 'EDID')), afterB: S(() => x.getValue(b, 'EDID')), afterNameA: S(() => x.name(a)) }; });
  step('19_NukeFile_loaded', () => S(() => { x.nukeFile(light); return { names: [0, 1, 2, 3, 4].map(i => S(() => x.name(x.fileByIndex(i)))) }; }));

  // ELEMENT / SERIALIZATION / VALUES
  step('20_SetElement', () => { const w = x.addFile('Set1.esp'); x.addMaster(w, 'Fixture.esm'); const r = x.addElement(w, 'BOOK\\BOOK'); x.addElementValue(r, 'EDID', 'SetBook'); const dst = x.getElement(r, 'DATA'); const src = x.getElement(book, 'DATA'); x.setIntValue(book, 'DATA\\Value', 0);
    return { copy: S(() => { x.setElement(dst, src); return J(r)['DATA - Data']; }), mismatch: S(() => { x.setElement(x.getElement(r, 'EDID'), src); return J(r)['EDID - Editor ID']; }) }; });
  step('34_UnloadPlugin', () => { const f = x.fileByName('Light.esp'); return S(() => { x.unloadPlugin(f); return { names: [0, 1, 2, 3, 4].map(i => S(() => x.name(x.fileByIndex(i)))) }; }); });
  step('37_GetGameLanguage_modes', () => { const o = {}; for (let m = 0; m <= 5; m++) o['mode' + m] = str('GetGameLanguage', m); return o; });
  step('35_CleanStore', () => S(() => { x.cleanStore(); return { after: S(() => x.name(first)) }; }));
  step('36_ResetStore', () => S(() => { x.resetStore(); return { oldHandle: S(() => x.name(first)) }; }));
});
