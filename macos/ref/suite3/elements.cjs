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
// Group (c): element API breadth on a small in-memory plugin (Elem1.esp) that
// references Fixture.esm records, plus the loaded fixtures themselves.
const { run } = require('./common.cjs');
run('elements', {}, async ({ x, step, errMsg, hex8 }) => {
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  const desc = h => (h ? { name: S(() => x.name(h)), path: S(() => x.path(h)), shortPath: S(() => x.path(h, true)), elementType: S(() => x.elementType(h)), count: S(() => x.elementCount(h)) } : null);
  const rdesc = h => (h ? { formId: S(() => hex8(x.getFormID(h))), sig: S(() => x.signature(h)), edid: S(() => x.getValue(h, 'EDID')), file: S(() => x.name(x.getElementFile(h))) } : null);
  const names = hs => hs.map(h => S(() => x.name(h)));
  let w, kywd, book, flst, fx, fixKywd, fixBook;
  fx = x.fileByName('Fixture.esm');
  fixKywd = x.getRecords(fx, 'KYWD')[0];
  fixBook = x.getRecords(fx, 'BOOK')[0];

  step('00_setup', () => { w = x.addFile('Elem1.esp'); x.addMaster(w, 'Fixture.esm');
    kywd = x.addElement(w, 'KYWD\\KYWD'); x.addElementValue(kywd, 'EDID', 'ElemKywd');
    book = x.addElement(w, 'BOOK\\BOOK'); x.addElementValue(book, 'EDID', 'ElemBook'); x.addElementValue(book, 'FULL', 'Elem Book');
    x.setIntValue(book, 'DATA\\Value', 42); x.setFlag(book, 'DATA\\Flags', 'Teaches Spell', true);
    x.addElement(book, 'KWDA'); x.addArrayItem(book, 'KWDA', '', 'FixtureChain'); x.addArrayItem(book, 'KWDA', '', 'ElemKywd');
    flst = x.addElement(w, 'FLST\\FLST'); x.addElementValue(flst, 'EDID', 'ElemList'); x.addArrayItem(flst, 'FormIDs', '', 'FixtureUnique'); x.addArrayItem(flst, 'FormIDs', '', 'FixtureChain');
    return { book: x.elementToJson(book) && JSON.parse(x.elementToJson(book)) }; });

  step('01_getElements_variants', () => { const out = {};
    for (const [label, h, p] of [['file', w, ''], ['group', w, 'BOOK'], ['record', book, ''], ['struct DATA', book, 'DATA'], ['array KWDA', book, 'KWDA'], ['header', book, 'Record Header'], ['flags', book, 'DATA\\Flags'], ['loaded file', fx, '']])
      for (const [sort, filter, sparse] of [[false, false, false], [true, false, false], [false, true, false], [true, true, false]]) // sparse=true is hazardous (hazard_getelements_sparse_*)
        out[`${label} sort=${+sort} filter=${+filter} sparse=${+sparse}`] = S(() => names(x.getElements(h, p, sort, filter, sparse)));
    return out; });
  step('02_getDefNames', () => ({ record: S(() => x.getDefNames(book)), struct: S(() => x.getDefNames(x.getElement(book, 'DATA'))), array: S(() => x.getDefNames(x.getElement(book, 'KWDA'))),
    group: S(() => x.getDefNames(x.getElement(w, 'BOOK'))), file: S(() => x.getDefNames(w)), kywd: S(() => x.getDefNames(kywd)), flst: S(() => x.getDefNames(flst)) }));
  step('03_getAddList', () => { const l = S(() => x.getAddList(w)); return { fileCount: Array.isArray(l) ? l.length : l, fileFirst: Array.isArray(l) ? l.slice(0, 12) : null, fileHasBook: Array.isArray(l) ? l.includes('BOOK - Book') : null,
    group: S(() => x.getAddList(x.getElement(w, 'BOOK'))), loadedGroup: S(() => x.getAddList(x.getElement(fx, 'KYWD'))) }; });
  step('04_types', () => { const out = {}; if (process.env.SUITE3_SKIP04) return null;
    const targets = { file: w, group: x.getElement(w, 'BOOK'), record: book, header: x.getElement(book, 'Record Header'), edid: x.getElement(book, 'EDID'), full: x.getElement(book, 'FULL'),
      struct: x.getElement(book, 'DATA'), array: x.getElement(book, 'KWDA'), arrayItem: x.getElement(book, 'KWDA\\[0]'), flags: x.getElement(book, 'DATA\\Flags'), int: x.getElement(book, 'DATA\\Value'),
      float: x.getElement(book, 'DATA\\Weight'), enum: x.getElement(book, 'DATA\\Type'), formid: x.getElement(book, 'Record Header\\FormID'), sigElem: x.getElement(book, 'Record Header\\Signature'), unused: x.getElement(book, 'DATA\\Unused'),
      bounds: x.getElement(book, 'OBND'), flstArray: x.getElement(flst, 'FormIDs'), loadedRec: fixBook };
    const getters = { elementType: h => x.elementType(h), defType: h => x.defType(h), valueType: h => x.valueType(h), smashType: h => x.smashType(h), isSorted: h => x.isSorted(h), isFixed: h => x.isFixed(h),
      sortKey: h => x.sortKey(h), canAdd: h => x.getCanAdd(h), isEditable: h => x.getIsEditable(h), isRemoveable: h => x.getIsRemoveable(h), name: h => x.name(h), longName: h => x.longName(h), displayName: h => x.displayName(h),
      pathLocal: h => x.path(h, false, true), pathShort: h => x.path(h, true), pathSort: h => x.path(h, false, false, true), pathName: h => x.pathName(h), pathNameShort: h => x.pathName(h, true) };
    // Target/getter pairs that kill the DLL process (found by bisection; see hazard_types_*.cjs).
    const skips = new Set(require('./skips_elements.json'));
    for (const k of Object.keys(targets)) { out[k] = {}; for (const g of Object.keys(getters)) {
      if (skips.has(k + '.' + g)) { out[k][g] = 'SKIPPED_HAZARD'; continue; }
      if (process.env.SUITE3_TRACE) console.error('   call', k + '.' + g);
      out[k][g] = S(() => getters[g](targets[k])); } }
    return out; });
  step('05_getLinksTo', () => ({ item0: rdesc(x.getLinksTo(book, 'KWDA\\[0]')), item1: rdesc(x.getLinksTo(book, 'KWDA\\[1]')), flstItem: rdesc(x.getLinksTo(flst, 'FormIDs\\[0]')),
    viaElement: S(() => rdesc(x.getLinksTo(x.getElement(book, 'KWDA\\[0]')))), nonRef: S(() => rdesc(x.getLinksTo(book, 'DATA\\Value'))), badPath: S(() => rdesc(x.getLinksTo(book, 'NOPE'))),
    recordItself: S(() => rdesc(x.getLinksTo(book, ''))) }));
  step('06_setLinksTo', () => { x.setLinksTo(book, 'KWDA\\[1]', fixKywd); return { item1: rdesc(x.getLinksTo(book, 'KWDA\\[1]')), json: JSON.parse(x.elementToJson(book))['KWDA - Keywords'] }; });
  step('07_getRefValue_getValue', () => ({ refItem0: S(() => x.getRefValue(book, 'KWDA\\[0]')), refItem1: S(() => x.getRefValue(book, 'KWDA\\[1]')), valItem0: S(() => x.getValue(book, 'KWDA\\[0]')), valItem1: S(() => x.getValue(book, 'KWDA\\[1]')),
    refNonRef: S(() => x.getRefValue(book, 'DATA\\Value')), refFlst: S(() => x.getRefValue(flst, 'FormIDs\\[1]')), valRecord: S(() => x.getValue(book, '')), valFull: S(() => x.getValue(book, 'FULL')),
    valStruct: S(() => x.getValue(book, 'DATA')), valFormID: S(() => x.getValue(book, 'Record Header\\FormID')), valSig: S(() => x.getValue(book, 'Record Header\\Signature')) }));
  step('08_signature_allowed', () => { const item = x.getElement(book, 'KWDA\\[0]'); const fitem = x.getElement(flst, 'FormIDs\\[0]');
    const allowed = (h, sig) => getBoolRaw('GetSignatureAllowed', h, sig); const list = h => S(() => x.getString(len => { if (!x.raw.GetAllowedSignatures(h, len)) throw new Error('GetAllowedSignatures failed'); }));
    function getBoolRaw(fn, h, sig) { return S(() => x.getBool(b => { if (!x.raw[fn](h, x.wcb(sig), b)) throw new Error(fn + ' failed'); })); }
    return { kwdaKYWD: allowed(item, 'KYWD'), kwdaBOOK: allowed(item, 'BOOK'), flstKYWD: allowed(fitem, 'KYWD'), flstBOOK: allowed(fitem, 'BOOK'), recordKYWD: allowed(book, 'KYWD'),
      listKwda: list(item), listFlst: list(fitem).toString().length > 0 ? list(fitem) : null, listRecord: list(book), listStruct: list(x.getElement(book, 'DATA')) }; });

  step('09_path_syntax', () => { const out = {};
    const paths = ['EDID', 'EDID - Editor ID', 'edid', 'Record Header', 'Record Header\\Signature', 'Record Header\\FormID', 'Record Header\\Record Flags', 'KWDA', 'KWDA - Keywords', 'KWDA\\[0]', 'KWDA\\[1]', 'KWDA\\[2]', 'KWDA\\[-1]',
      'KWDA\\0', 'KWDA\\[00000800]', 'KWDA\\KWDA - Keyword', 'DATA', 'DATA\\Value', 'DATA\\[3]', 'DATA\\[0]', 'DATA - Data\\Value', '[0]', '[1]', '[99]', 'OBND\\X1', 'FULL', 'DESC', 'NOPE', 'DATA\\Nope', '', '\\', 'EDID\\', '\\EDID'];
    for (const p of paths) out['record|' + p] = S(() => { const h = x.getElement(book, p); return { name: x.name(h), path: x.path(h), has: x.hasElement(book, p) }; });
    for (const p of ['BOOK', 'BOOK\\[0]', 'BOOK\\ElemBook', 'BOOK\\00000800', 'BOOK\\BOOK', 'KYWD\\[0]', 'KYWD\\[1]', 'KYWD\\ElemKywd', '[0]', '[1]', 'ElemBook', 'ElemKywd', 'FLST\\ElemList', 'FLST\\[0]\\FormIDs', 'FLST\\[0]\\FormIDs\\[0]', 'Record Header', 'File Header', 'File Header\\Record Header\\Signature', 'File Header\\HEDR', 'File Header\\Master Files', 'File Header\\Master Files\\[0]', 'NOPE', 'BOOK\\Nope', 'XXXX'])
      out['file|' + p] = S(() => { const h = x.getElement(w, p); return { name: x.name(h), path: x.path(h), has: x.hasElement(w, p) }; });
    for (const p of ['KYWD', 'KYWD\\FixtureChain', 'KYWD\\[1]', 'KYWD\\00000801', 'KYWD\\FixtureUnique\\EDID', 'BOOK\\FixtureCompressed', 'BOOK\\[0]\\FULL', 'FixtureChain', 'FixtureCompressed', '00000800', '00000802', '[0]', '[2]', 'File Header\\Record Header\\Record Flags\\ESM', 'File Header\\CNAM', 'File Header\\HEDR\\Version', 'Fixture.esm\\KYWD'])
      out['loadedFile|' + p] = S(() => { const h = x.getElement(fx, p); return { name: x.name(h), path: x.path(h), has: x.hasElement(fx, p) }; });
    for (const p of ['Fixture.esm', 'Fixture.esm\\KYWD', 'Fixture.esm\\KYWD\\FixtureChain', 'Fixture.esm\\00000800', 'Fixture.esm\\KYWD\\00000800', 'Fixture.esm\\KYWD\\[0]', 'Fixture.esm\\FixtureChain', 'First.esp\\KYWD\\00000800', 'First.esp\\00000800', 'Second.esp\\KYWD\\FixtureSecond', 'Light.esp\\KYWD\\[0]', 'Light.esp\\03000800', 'Light.esp\\00000800', 'Nope.esp', '[0]', '[4]', '[5]', 'Elem1.esp', 'Elem1.esp\\BOOK\\ElemBook'])
      out['root|' + p] = S(() => { const h = x.getElement(0, p); return { name: x.name(h), path: x.path(h) }; });
    return out; });

  step('10_hasElement_elementCount_equals_matches', () => ({ hasEdid: x.hasElement(book, 'EDID'), hasNope: x.hasElement(book, 'NOPE'), hasKwda: x.hasElement(book, 'KWDA'), hasFileBook: x.hasElement(w, 'BOOK'),
    countFile: x.elementCount(w), countGroup: x.elementCount(x.getElement(w, 'BOOK')), countRecord: x.elementCount(book), countKwda: x.elementCount(x.getElement(book, 'KWDA')), countLoaded: x.elementCount(fx),
    equalsSelf: x.elementEquals(book, book), equalsOther: x.elementEquals(book, kywd), equalsReget: x.elementEquals(book, x.getElement(w, 'BOOK\\ElemBook')), equalsLoaded: x.elementEquals(fixKywd, x.getElement(fx, 'KYWD\\FixtureChain')),
    matchEdid: x.elementMatches(book, 'EDID', 'ElemBook'), matchEdidWrong: x.elementMatches(book, 'EDID', 'Other'), matchValue: x.elementMatches(book, 'DATA\\Value', '42'), matchRef: S(() => x.elementMatches(book, 'KWDA\\[0]', 'FixtureChain')),
    matchRefHex: S(() => x.elementMatches(book, 'KWDA\\[0]', '00000800')), matchBadPath: S(() => x.elementMatches(book, 'NOPE', 'x')) }));
  step('11_arrays_lookup', () => ({ hasChain: x.hasArrayItem(book, 'KWDA', '', 'FixtureChain'), hasUnique: x.hasArrayItem(book, 'KWDA', '', 'FixtureUnique'), hasHex: S(() => x.hasArrayItem(book, 'KWDA', '', '00000800')),
    get: S(() => rdesc(x.getLinksTo(x.getArrayItem(book, 'KWDA', '', 'FixtureChain')))), getMissing: S(() => x.getArrayItem(book, 'KWDA', '', 'FixtureUnique')),
    flstHas: x.hasArrayItem(flst, 'FormIDs', '', 'FixtureUnique'), hasBadPath: S(() => x.hasArrayItem(book, 'NOPE', '', 'x')) }));
  step('12_navigation', () => { const edid = x.getElement(book, 'EDID'), item = x.getElement(book, 'KWDA\\[0]'), val = x.getElement(book, 'DATA\\Value');
    return { containerOfEdid: desc(x.getContainer(edid)), containerOfItem: desc(x.getContainer(item)), containerOfRecord: desc(x.getContainer(book)), fileOfItem: S(() => x.name(x.getElementFile(item))), fileOfLoaded: S(() => x.name(x.getElementFile(fixBook))),
      groupOfRecord: desc(x.getElementGroup(book)), groupOfEdid: S(() => desc(x.getElementGroup(edid))), recordOfVal: rdesc(x.getElementRecord(val)), recordOfRecord: rdesc(x.getElementRecord(book)), recordOfFile: S(() => rdesc(x.getElementRecord(w))), containerOfFile: S(() => desc(x.getContainer(w))) }; });
  step('13_records_by_signature_edid_formid', () => { const out = {};
    for (const [fh, label] of [[fx, 'Fixture.esm'], [x.fileByName('Second.esp'), 'Second.esp'], [w, 'Elem1.esp']])
      for (const search of ['', 'KYWD', 'BOOK', 'FLST', 'kywd', 'FixtureChain', 'FixtureCompressed', 'NOPE', 'KYWD,BOOK', 'KYWD\r\nBOOK'])
        for (const ov of [false, true]) out[`${label}|${JSON.stringify(search)}|ov=${+ov}`] = S(() => x.getRecords(fh, search, ov).map(r => rdesc(r)));
    return out; });
  step('14_getRecord_by_formid', () => ({ fixtureChain: S(() => rdesc(x.getRecord(fx, 0x800))), fixtureChainFullId: S(() => rdesc(x.getRecord(fx, 0x00000800))), uniq: S(() => rdesc(x.getRecord(fx, 0x801))), bookById: S(() => rdesc(x.getRecord(fx, 0x802))),
    missing: S(() => rdesc(x.getRecord(fx, 0x900))), inSecondOverride: S(() => rdesc(x.getRecord(x.fileByName('Second.esp'), 0x800, false))), inSecondViaMasters: S(() => rdesc(x.getRecord(x.fileByName('Second.esp'), 0x801, true))),
    inSecondNoMasters: S(() => rdesc(x.getRecord(x.fileByName('Second.esp'), 0x801, false))), light: S(() => rdesc(x.getRecord(x.fileByName('Light.esp'), 0x03000800))), elem: S(() => rdesc(x.getRecord(w, 0x04000801))) }));
  step('15_find_next_previous', () => { const f = (fn, ...a) => S(() => rdesc(x[fn](...a)));
    return { nextRecEdid: f('findNextRecord', fx, 'Fixture', true, false), nextRecEdidNoMatch: f('findNextRecord', fx, 'zzz', true, false), nextRecName: f('findNextRecord', fx, 'Compressed', false, true), prevRecEdid: f('findPreviousRecord', fx, 'Fixture', true, false),
      nextRecFromRecord: f('findNextRecord', fixKywd, 'FixtureUnique', true, false), prevRecFromRecord: f('findPreviousRecord', x.getRecords(fx, 'BOOK')[0], 'FixtureChain', true, false),
      nextElemPath: S(() => desc(x.findNextElement(book, 'DATA', true, false))), nextElemValue: S(() => desc(x.findNextElement(book, 'Elem', false, true))), prevElemPath: S(() => desc(x.findPreviousElement(x.getElement(book, 'DATA\\Weight'), 'EDID', true, false))),
      nextElemNone: S(() => desc(x.findNextElement(book, 'zzzz', true, true))) }; });
  step('16_files_lookup', () => ({ byName: x.name(x.fileByName('first.esp')), byIndex: [0, 1, 2, 3, 4].map(i => S(() => x.name(x.fileByIndex(i)))), byLoadOrder: [0, 1, 2, 3, 4, 5].map(i => S(() => x.name(x.fileByLoadOrder(i)))),
    byAuthor: S(() => x.name(x.fileByAuthor(''))), byAuthorMissing: S(() => x.name(x.fileByAuthor('nobody'))), missing: S(() => x.name(x.fileByName('Nope.esp'))) }));
  step('17_filter', () => { const out = {};
    out.before = names(x.getElements(w, 'BOOK', false, true));
    out.markBook = S(() => { x.filterRecord(book); return null; });
    out.afterFilterElementsFile = S(() => names(x.getElements(w, '', false, true))); out.afterFilterGroup = S(() => names(x.getElements(w, 'BOOK', false, true)));
    out.afterFilterKywdGroup = S(() => names(x.getElements(w, 'KYWD', false, true))); out.afterFilterUnfiltered = S(() => names(x.getElements(w, 'KYWD', false, false)));
    out.markKywd = S(() => { x.filterRecord(kywd); return null; }); out.afterBothKywd = S(() => names(x.getElements(w, 'KYWD', false, true)));
    out.reset = S(() => { x.resetFilter(); return null; }); out.afterReset = S(() => names(x.getElements(w, 'KYWD', false, true)));
    return out; });
  step('18_modified_editable', () => ({ fileModified: x.getIsModified(w), loadedModified: x.getIsModified(fx), recEditable: x.getIsEditable(book), loadedRecEditable: x.getIsEditable(fixBook), loadedFileEditable: x.getIsEditable(fx),
    setNotEditableOnRecord: S(() => { x.setIsEditable(book, false); return x.getIsEditable(book); }),
    setNotEditableOnFile: S(() => { x.setIsEditable(w, false); return [x.getIsEditable(w), x.getIsEditable(book)]; }), setBackEditableOnFile: S(() => { x.setIsEditable(w, true); return [x.getIsEditable(w), x.getIsEditable(book)]; }) }));
});
