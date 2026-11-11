# Reference harness for plugin queries

This harness compares native XEditLib query results with a deterministic Windows DLL reference. Generated files stay under this directory.

## Artifacts and coverage

- `fixtures/Data/Fixture.esm`: 279 bytes, ESM flag, two KYWD records and one zlib-compressed BOOK.
- `First.esp`: 148 bytes, master Fixture.esm, overrides KYWD 00000800.
- `Second.esp`: 149 bytes, same master and record, wins the three-version chain.
- `Light.esp`: 116 bytes, ESL flag, one owned KYWD at object ID 000800.
- `query.cjs`: plugin query runner via `xeditlib` wrapper (`XEDITLIB_JS` or `NODE_PATH`), `XEDITLIB_PATH` and `GAME_PATH`.
  - Explicitly loads the four fixture plugins with `smartLoad=false` and `useDummies=false`.
  - Binds `GetConflictData` directly through koffi.
  - Outputs recursively key-sorted JSON with files sorted by name and records sorted by resolved FormID.
  - Captures masters, load-order indices, record/override counts, version chains, winning records, conflict byte enums, and `ElementToJson` representations.
- `reference/expected.json`: actual Windows DLL output, not a JS-parser prediction.
- `generate.cjs`: xelib fixture creation; default read-only plan/init pass; --apply creates fresh in-memory files and saves into fixtures/Data.
- `verify.cjs`: independent pure-JS parser and validator.
  - Checks byte-size limits and master links.
  - Verifies raw ESM, ESL, and compression flags.
  - Validates decompressed BOOK EDID/FULL data.
  - Asserts three-version winner resolution.
- `run-native.sh /absolute/path/libXEditLib.dylib`: native Node invocation of the same query, success-marker and JSON validation, exact unified diff against reference.

Fixtures are generated through xelib and load without Skyrim.esm. Reported load order comes from explicitly loaded files through GetFileLoadOrder; registry/profile load-order lookup is not used.

## Reference generation and execution

`wine-run.sh` records the Wine environment setup: private prefix, Windows Node, paths for Windows DLL/wrapper, NODE_PATH pointing to koffi, game path restricted to fixtures, temporary files under runtime. Windows Node version: v24.22.0. Windows DLL SHA-256: 5599144df4138b65541fa5296ef8fbf3acc73ca821ab1296496af77370055648.

generate.cjs defaults to a dry run. Use --apply to generate fixtures, verify.cjs to check their structure, and run-native.sh to compare the native query output with reference/expected.json. A successful comparison exits 0.

Fixture format details: file flags require `File Header\Record Header\Record Flags`, not bare Record Header or TES4; new EDID/FULL need AddElementValue rather than SetValue; BOOK's compression flag has no named `Compressed` entry, but SetUIntValue of its record flags to 0x40000 persists actual compressed bytes. AddFile needs ignoreExists=true to regenerate existing scratch fixtures.

## Scope and coverage baseline

Corpus excludes localized masters/string tables, references, assets, complex CELL/worldspace groups, injected/deleted records, ITM-specific scenarios, BSA, and real active order. Conflict enums are preserved as numeric DLL output. The no-master ESL exercises flags and form-ID mapping supported by this DLL, not game runtime qualification.

Place the required Hardcoded.dat file beside the native library. Plugin corpus itself totals 692 bytes.
