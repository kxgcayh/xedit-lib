# Behaviour reference suite (19 groups)

This suite captures Windows XEditLib.dll results for 19 test groups and compares native-library output with those references. Each capture is run twice to check determinism. Set XEDITLIB_JS to the wrapper package location; exports unavailable through the wrapper are bound directly through koffi.

## Layout

- `suite3/common.cjs`: shared runner. Fresh copy of `fixtures/Data` into `runtime/suite3/<group>/Data` (fixed mtimes, because `GetLoadOrder` sorts by file time), init, load, run steps, print recursively key-sorted JSON. Absolute paths (any separator, with or without a drive letter) are replaced by `<ROOT>` and ADDR/near-text noise in error messages is normalised inside the script, not afterwards. Handles are never printed (they are allocator specific).
- `suite3/<group>.cjs`: one script per group, `suite3/groups.txt` lists them, `suite3/skips_*.json` lists call pairs that must not run in a group (see hazards).
- `reference3/<group>.json`: actual Windows DLL output.
- `capture3.sh [group...]`: runs each group twice under Wine, keeps `reference3/<group>.json` only if both runs exit 0 and are byte-identical.
- `run-native3.sh /abs/libXEditLib.dylib [group...]`: runs each group with `node` from PATH (using XEDITLIB_PATH, GAME_PATH=$PWD/fixtures, XEDITLIB_JS or NODE_PATH, and GROUP_TIMEOUT (default 180 seconds)), compares byte-for-byte, prints a PASS / DIFF / CRASH table, writes `diagnostics3/<group>.diff|stderr`, exits 1 on any non-PASS (2 on usage error).
- Fixture sizes: the four fixture plugins (692 bytes in total); everything the suite generates under `runtime/suite3` is below 2 KB per file (largest outputs are the saved plugins, about 500 bytes, and the tiny BSA, 567 bytes).

## Groups

| Group | Covers |
|---|---|
| `write` (a) | AddFile (duplicate, ignoreExists, existing name), AddMaster/AddMasters (duplicate, unknown), AddElement/AddElementValue records, SetValue/SetIntValue/SetUIntValue/SetFloatValue/SetFlag (incl. error paths), Get*/GetEnabledFlags/GetAllFlags, array AddArrayItem/HasArrayItem/RemoveArrayItem/MoveArrayItem (sorted array error, unsorted FLST move, out of range), RemoveElement/RemoveElementOrParent, CopyElement (override into same file, new record, override into a new plugin with and without master, twice), AddRequiredMasters, SortMasters/CleanMasters, RenameFile (also to an existing name), SaveFile (explicit path, default path, missing directory, resave of a loaded plugin). SHA-256 and a hex dump of each saved plugin; reload through LoadPlugin and ElementToJson of the reloaded files. |
| `json` (b) | ElementFromJson: record round trip (FormID stripped, see below), scalar types, flags, sub-path import, array items by hex FormID, EditorID string and `File:hex6` string (both fail), group `Records`, file `File Header`+`Groups`, multi-file form (`ElementFromJson(0,"")`), malformed JSON, signature mismatch, unknown key, UTF-16 string round trip, save + hex dump + reload. |
| `elements` (c) | GetElements (sort/filter variants, many container kinds), GetDefNames, GetAddList, ElementType/DefType/ValueType/SmashType, SortKey, IsSorted/IsFixed, GetCanAdd/GetIsEditable/GetIsRemoveable, Name/LongName/DisplayName/Path variants/PathName, GetLinksTo/SetLinksTo on a BOOK whose KWDA references KYWD records, GetRefValue/GetValue, GetSignatureAllowed/GetAllowedSignatures, about 90 path syntax variants (record, file, loaded file and root `File\...` forms), HasElement/ElementCount/ElementEquals/ElementMatches, array lookups, GetContainer/GetElementFile/GetElementGroup/GetElementRecord, GetRecords by signature/EditorID/override flag, GetRecord by FormID, FindNext/PreviousRecord and Element, FileByName/Index/LoadOrder/Author, FilterRecord/ResetFilter with filtered GetElements, GetIsModified/SetIsEditable. |
| `errors` (d) | CheckForErrors/GetErrorThreadDone/GetErrors on a plugin with two unresolved references (handles stripped), a clean loaded file, a record, RemoveIdenticalRecords, 11 exception-message captures through GetExceptionMessage (bad path, missing file, bad signature, invalid/released/zero handle, missing record, bad game mode, ...), consume-on-read behaviour, GetMessages/ClearMessages. The Delphi stack text is not recorded (implementation specific). |
| `resources` (e) | BuildArchive (bound with koffi, SSE archive type): uncompressed, compressed, shared with explicit flags, and the empty / missing file / bad flag error texts; SHA-256 and hex dump of each BSA; automatic loading of `Fixture.bsa` by plugin name; GetLoadedContainers, GetContainerFiles (path filter, unknown container), GetFileContainer (case, slash, missing), LoadContainer (archive, folder, duplicate, missing), ExtractFile, ExtractContainer (replace flag); GetTextureData on a hand-built 4x4 A8R8G8B8 DDS (bytes, size), on a non-image and on a missing resource, with GetResultBytes. |
| `localized` (e) | The DLL writes a localized plugin (flag 0x80 and string IDs) but never writes the string tables, so `.STRINGS`/`.DLSTRINGS`/`.ILSTRINGS` are hand-built fixture files that the DLL then reads; also the same plugin without tables, editing a localized string, saving it again. |
| `misc` (f) | GetGlobals/GetGlobal (machine-specific paths masked), SetSortMode, Release, ReleaseNodes, GetDuplicateHandles, Switch, GetGamePath, GetLoadOrder/GetActivePlugins, SetGameMode/SetBackupPath/SetLanguage, LoadPluginHeader, BuildReferences + GetReferencedBy (sync and async), CRCHash, MD5Hash (record only), SortEditorIDs/SortNames, NukeFile, SetElement, GetRecordDef + DefToJson, GetEnumOptions, SetEnabledFlags, SignatureFromName/NameFromSignature/GetSignatureNameMap, GetFormID local flag, SetFormID, GetREFRs, GetOverrides/GetMasterRecord/GetPreviousOverride/GetWinningOverride/IsWinningOverride, IsInjected/GetInjectionTarget, FindValidReferences, ExchangeReferences, GetNodes/GetNodeElements, GetConflictData on new records, GetGameLanguage (all modes), UnloadPlugin, CleanStore, ResetStore. |
| `lifecycle` (f) | UnloadPlugin success and non-last error, reload, NukeFile on loaded plugins, ResetStore followed by lookups. |
| `hazard_*` (11 groups) | One risky call each (ten raise an access violation, `hazard_getelements_sparse_array` returns null-reference handles whose `Name` errors), each with a "process remains usable" step. |

The suite exercises the native API through xelib.raw and direct koffi bindings. Initialization and shutdown happen in the shared runner; see each group's source for the exact calls.

## Windows DLL behaviours recorded by this suite

1. A second exception after an access violation kills the process. Any call that raises `Access violation` inside the DLL is caught and reported normally, but the next exception raised in the same process terminates it silently (exit code 5, no output). The access-violation calls are therefore isolated in `hazard_*` groups with one violation each: `GetAddList` on a record; `ElementFromJson` with a `FormID` in any Record Header (record, group and file forms, both `File:hex6` and plain hex, including a FormID identical to the record's own); `GetElements(sparse=true)` on a flags element (a separate group records that sparse array results are null-reference handles); `DefType` and `SmashType` on a file and on a group; `GetGamePath` with an out-of-range mode. A native build that returns an error string instead of crashing will show DIFF there, which is the useful signal.
2. ElementToJson emits File:hex6 FormIDs, but this Windows DLL does not accept them in ElementFromJson. Array imports accept 8-digit hex strings; Record Header FormID imports raise an access violation. The round-trip test therefore removes the FormID field before import.
3. Other DLL behaviours captured as-is: `AddFile` with `ignoreExists` still fails if the name is already in memory; `AddMaster` keeps masters sorted so `SortMasters` never changes anything on tiny inputs; `SaveFile` with an empty path writes `<name>.esp.save`; `SaveFile` creates missing directories; paths the DLL builds use a lowercase `data` segment (the engine concatenates `data\`) while the container API keeps the case it was given; `GetLoadOrder`/`GetActivePlugins` come from the Data directory ordered by file time; `GetGamePath` and `GetGameLanguage` fail for every game mode; `NukeFile` and `UnloadPlugin` on loaded plugins behave unexpectedly (see `lifecycle`); `SetFormID` into an unavailable master errors; `GetErrors` JSON contains handle numbers (stripped).
4. `wine-run.sh` needs stdout/stderr redirected to regular files (a pipe or `/dev/null` makes Windows Node fail with `Failed to sync '<stdout>'`).

## Exports or behaviours not exercised, and why

- `MD5Hash` on a file handle: never returns under Wine (infinite loop inside the DLL; timed out after 40 s, also standalone). Only the record variant is called (it returns an error). `CRCHash` works and is covered.
- `LoadPlugin` of a nonexistent plugin: returns true, reports nothing, and makes a later `CloseXEdit` kill the process (exit 5). Not capturable as a deterministic group, so it is only noted here.
- `BuildArchive` for FO4 BA2 types (archive types 5 and 6), `GetTextureData` for DXT/BC formats and mipmapped DDS, `ExtractContainer`/`LoadContainer` on BA2: the fixtures are SSE-only and the game mode is fixed to SSE; no BA2 fixture was built.
- `GetGamePath`, `GetGameLanguage` and `GetActivePlugins` depend on the registry or `plugins.txt` in a real game install; they were called, but only the failure (or Data-directory) answers could be captured on tiny fixtures.
- `GetREFRs`, `GetNodes` on files and `GetInjectionTarget` with a real injected record: no CELL/REFR or injected records exist in the tiny fixtures, so only the empty or error answers are captured.
- `GetEnumOptions` for most enumerations returns `Element does not have enumeration` or an empty list; only the `Teaches` actor value list returns values.
- `GetMessages` content from a plugin load is not captured (the messages are cleared in `errors` step 22 and loading tiny plugins emits none).
- Sparse `GetElements` and the `sort`/`filter` combinations on exotic containers beyond those listed were not enumerated exhaustively.
- Not deterministic, hence masked or not recorded: Delphi exception stack text, machine paths in `GetGlobals` (`ProgramPath`, `AppDataPath`, `MyGamesPath`, `GameIniPath`), handle numbers in `GetErrors`, the memory garbage in the malformed JSON message (`near <...>`), access-violation addresses, and the loader status immediately after an asynchronous `BuildReferences`.

## Commands

Run these commands from macos/ref with Node.js on PATH.

```sh
# capture (Windows DLL under Wine); writes reference3/*.json, each group run twice
./capture3.sh                      # all groups
./capture3.sh elements misc        # some groups

# one group by hand
./wine-run.sh suite3/write.cjs > runtime/out/write.json 2> runtime/out/write.err    # stdout must be a regular file
SUITE3_TRACE=1 ./wine-run.sh suite3/misc.cjs > runtime/out/m.json 2> runtime/out/m.err   # trace prints step names and results to stderr
SUITE3_ONLY=04,05 ./wine-run.sh suite3/elements.cjs > runtime/out/e.json 2> runtime/out/e.err   # run only some steps (after 00_setup)

# native comparison
./run-native3.sh /absolute/path/libXEditLib.dylib             # all groups
./run-native3.sh /absolute/path/libXEditLib.dylib json misc   # some groups

# Check script syntax
for f in suite3/*.cjs; do node --check "$f"; done; bash -n capture3.sh run-native3.sh
```

Generated outputs and temporary fixture copies are written under runtime/; comparison diagnostics are written under diagnostics3/.
