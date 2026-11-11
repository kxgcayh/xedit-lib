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
// Group (e): resource handling. Builds a tiny BSA through the DLL (BuildArchive is
// exported but not bound by xelib.js, so it is bound here with koffi), then reads
// it back through the container API; also a 4x4 DDS through GetTextureData.
const { run } = require('./common.cjs');
run('resources', { load: [] }, async ({ x, lib, step, stepAsync, dir, data, path, fs, fileInfo, sha256, errMsg, norm }) => {
  const BuildArchive = lib.func('uint16 BuildArchive(void*, void*, void*, int, uint16, uint16, void*, void*)');
  const GetTextureData = lib.func('uint16 GetTextureData(void*, void*, void*)');
  const S = fn => { try { const v = fn(); return v === undefined ? null : v; } catch (e) { return { error: errMsg(e) }; } };
  const src = path.join(dir, 'assets');
  const sep = path.sep;

  function dds4x4() { // uncompressed A8R8G8B8, 4x4, no mips: 128-byte header + 64 bytes
    const b = Buffer.alloc(128 + 64); b.write('DDS ', 0, 'latin1'); b.writeUInt32LE(124, 4); b.writeUInt32LE(0x100f, 8); b.writeUInt32LE(4, 12); b.writeUInt32LE(4, 16); b.writeUInt32LE(16, 20);
    b.writeUInt32LE(32, 76); b.writeUInt32LE(0x41, 80); b.writeUInt32LE(32, 88); b.writeUInt32LE(0x00ff0000, 92); b.writeUInt32LE(0x0000ff00, 96); b.writeUInt32LE(0x000000ff, 100); b.writeUInt32LE(0xff000000, 104); b.writeUInt32LE(0x1000, 108);
    for (let i = 0; i < 16; i++) { const o = 128 + i * 4; b[o] = (i * 16) & 255; b[o + 1] = (255 - i * 8) & 255; b[o + 2] = (i * 4) & 255; b[o + 3] = 255 - (i % 4) * 32; } // B G R A
    return b;
  }
  const files = { 'textures\\fixture\\tiny.dds': dds4x4(), 'meshes\\fixture\\note.txt': Buffer.from('tiny text payload\r\n'), 'scripts\\fixture\\readme.txt': Buffer.from('second payload '.repeat(8)) };

  step('01_build_asset_files', () => { const out = {};
    for (const [rel, buf] of Object.entries(files)) { const p = path.join(src, ...rel.split('\\')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); out[rel] = { size: buf.length, sha256: sha256(buf) }; }
    return out; });

  const build = (archiveName, rels, compress, share, af, ff) => { const p = path.join(data, archiveName);
    const ok = BuildArchive(x.wcb(p), x.wcb(src + sep), x.wcb(rels.join('\r\n')), 4, compress ? 1 : 0, share ? 1 : 0, x.wcb(af), x.wcb(ff));
    return { ok, exception: ok ? '' : norm(x.getExceptionMessage()), file: fileInfo(p) }; };
  step('02_BuildArchive_Fixture_uncompressed', () => build('Fixture.bsa', Object.keys(files), false, false, '', ''));
  step('03_BuildArchive_Extra_compressed', () => build('Extra.bsa', ['meshes\\fixture\\note.txt', 'scripts\\fixture\\readme.txt'], true, false, '', ''));
  step('04_BuildArchive_Shared_with_flags', () => build('Shared.bsa', ['meshes\\fixture\\note.txt'], false, true, '0003', '0001'));
  step('05_BuildArchive_no_files', () => build('Empty.bsa', [], false, false, '', ''));
  step('06_BuildArchive_missing_source_file', () => build('Missing.bsa', ['meshes\\fixture\\nope.txt'], false, false, '', ''));
  step('07_BuildArchive_bad_flags', () => build('BadFlags.bsa', ['meshes\\fixture\\note.txt'], false, false, 'zz', ''));

  await stepAsync('08_load_plugins_autoloads_matching_archive', async () => { x.loadPlugins(['Fixture.esm', 'First.esp', 'Second.esp', 'Light.esp'].join('\n'), false, false); await x.waitForLoader(30000);
    return { containers: x.getLoadedContainers() }; });
  const cname = base => x.getLoadedContainers().find(c => c.toLowerCase().endsWith(base.toLowerCase())) || base;
  const files2 = (name, p) => S(() => x.getString(len => { if (!x.raw.GetContainerFiles(x.wcb(name), x.wcb(p), len)) throw new Error('GetContainerFiles failed'); }).split('\r\n').filter(Boolean).sort());
  step('09_GetContainerFiles', () => ({ fixtureBsa: files2(cname('Fixture.bsa'), ''), fixtureBsaTextures: files2(cname('Fixture.bsa'), 'textures'), fixtureBsaMeshes: files2(cname('Fixture.bsa'), 'meshes\\fixture'), fixtureBsaNoMatch: files2(cname('Fixture.bsa'), 'sounds'), fixtureBsaShortName: files2('Fixture.bsa', ''),
    unknownContainer: files2('Nope.bsa', ''), allContainersTextures: files2('', 'textures'), allContainers: files2('', '') }));
  step('10_GetFileContainer', () => { const f = p => S(() => x.getString(len => { if (!x.raw.GetFileContainer(x.wcb(p), len)) throw new Error('GetFileContainer failed'); }));
    return { dds: f('textures\\fixture\\tiny.dds'), note: f('meshes\\fixture\\note.txt'), upper: f('TEXTURES\\FIXTURE\\TINY.DDS'), missing: f('meshes\\nope.txt'), forwardSlash: f('textures/fixture/tiny.dds') }; });
  step('11_LoadContainer_extra_archive', () => { x.loadContainer(path.join(data, 'Extra.bsa')); return x.getLoadedContainers(); });
  step('12_LoadContainer_already_loaded', () => { x.loadContainer(path.join(data, 'Extra.bsa')); });
  step('13_LoadContainer_folder', () => { x.loadContainer(src); return x.getLoadedContainers(); });
  step('14_LoadContainer_missing_path', () => { x.loadContainer(path.join(data, 'Nope.bsa')); });
  step('15_GetFileContainer_after_extra', () => { const f = p => S(() => x.getString(len => { if (!x.raw.GetFileContainer(x.wcb(p), len)) throw new Error('GetFileContainer failed'); }));
    return { note: f('meshes\\fixture\\note.txt'), readme: f('scripts\\fixture\\readme.txt'), dds: f('textures\\fixture\\tiny.dds') }; });
  const out = path.join(dir, 'extracted');
  step('16_ExtractFile', () => { const r = {}; for (const [c0, rel] of [['Fixture.bsa', 'textures\\fixture\\tiny.dds'], ['Fixture.bsa', 'meshes\\fixture\\note.txt'], ['Extra.bsa', 'scripts\\fixture\\readme.txt']]) {
    const c = cname(c0); const dest = path.join(out, c0 + '_' + rel.replace(/\\/g, '_')); r[c0 + '|' + rel] = S(() => { x.extractFile(c, rel, dest); const b = fs.readFileSync(dest); return { size: b.length, sha256: sha256(b), matchesSource: sha256(b) === sha256(files[rel]) }; }); }
    r.missingFile = S(() => x.extractFile(cname('Fixture.bsa'), 'meshes\\nope.txt', path.join(out, 'x.bin'))); r.missingContainer = S(() => x.extractFile('Nope.bsa', 'meshes\\fixture\\note.txt', path.join(out, 'y.bin')));
    r.emptyContainerName = S(() => { const dest = path.join(out, 'fromdata.txt'); x.extractFile('', 'meshes\\fixture\\note.txt', dest); return fs.existsSync(dest) ? fs.readFileSync(dest).length : 'not written'; }); return r; });
  step('17_ExtractContainer', () => { const dest = path.join(dir, 'extracted_all'); const r = { first: S(() => { x.extractContainer(cname('Fixture.bsa'), dest, false); return null; }) };
    const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(dest, path.join(d, e.name)).replace(/\\/g, '/') + ':' + fs.statSync(path.join(d, e.name)).size]) : [];
    r.files = walk(dest).sort(); r.again_no_replace = S(() => { x.extractContainer(cname('Fixture.bsa'), dest, false); return null; }); r.again_replace = S(() => { x.extractContainer(cname('Fixture.bsa'), dest, true); return null; });
    r.unknown = S(() => { x.extractContainer('Nope.bsa', dest, true); return null; }); return r; });

  const tex = name => { const w = Buffer.alloc(4), h = Buffer.alloc(4); const ok = GetTextureData(x.wcb(name), w, h);
    if (!ok) return { ok, exception: norm(x.getExceptionMessage()) };
    const W = w.readInt32LE(0), H = h.readInt32LE(0); const bytes = Buffer.alloc(W * H * 4 + 2); const got = x.raw.GetResultBytes(bytes, W * H * 4);
    return { ok, width: W, height: H, gotBytes: got, rgba: [...bytes.subarray(0, W * H * 4)].reduce((a, v, i) => (i % 4 === 0 ? a.push([v]) : a[a.length - 1].push(v), a), []) }; };
  step('18_GetTextureData_dds', () => tex('textures\\fixture\\tiny.dds'));
  step('19_GetTextureData_non_image', () => S(() => tex('meshes\\fixture\\note.txt')));
  step('20_GetTextureData_missing', () => S(() => tex('textures\\fixture\\nope.dds')));
});
