# macOS arm64 Port Changes

Changes dated 2026-11-11 by kxgcayh. This Modification is derived from XEditLib Original Code provided by Initial Developer matortheeternal and from xEdit Original Code by ElminsterAU and contributors, including Sharlikran, Zilav and Hlp. Covered Code is distributed under MPL 1.1 (license.txt); separately licensed components retain their original terms.

New files: lib/xedit/lz4/lz4FPC.inc maps Free Pascal architecture defines; macos/shim/ supplies the POSIX compatibility units; macos/build.sh builds the arm64 dylib; macos/tests/ contains unit and host-integration tests; macos/ref/ contains generated plugin fixtures and Windows/native comparison tooling. New original port sources are by kxgcayh, 2026, under MPL 1.1.

## Per-File Change List

### (a) Free Pascal Compatibility

- `XEditLib.dpr`: Added Free Pascal runtime and fault handling units (cthreads, cwstring, DelphiMessages, NativeFaults) and guarded Windows-only directives.
- `lib/Argo/Argo.pas`: Added reintroduce directive to ToString and semicolon to Create constructor declaration under Free Pascal.
- `lib/Argo/ArgoTypes.pas`: Overrode DoCompareText instead of CompareStrings in TFastStringList under Free Pascal.
- `lib/BSArch/wbBSArchive.pas`: Normalized archive path separators for POSIX and raised EFOpenError when input files are not found.
- `lib/Imaging/Imaging.pas`: Enabled assertions under Free Pascal to match shipped DLL behaviour.
- `lib/TForge/TFL.inc`: Guarded Intel assembly mode directive to x86 and x86_64 architectures.
- `lib/mte/mteHelpers.pas`: Implemented case-insensitive mask matching, POSIX directory traversal with FindFirst, and MatchText under Free Pascal.
- `lib/xedit/lz4/lz4.pas`, `lib/xedit/lz4/lz4Common.pas`, `lib/xedit/lz4/lz4HC.pas`, `lib/xedit/lz4/lz4frame.pas`, `lib/xedit/lz4/lz4frame_static.pas`: Included lz4FPC.inc for architecture defines and guarded Windows unit imports under Free Pascal.
- `lib/xedit/lz4/xxHash.pas`: Implemented XXH_rotl32 and XXH_rotl64 using Free Pascal RolDWord and RolQWord intrinsics.
- `lib/xedit/wbBSA.pas`: Normalized archive entry path separators to forward slashes under Free Pascal for POSIX file operations.
- `lib/xedit/wbDefinitionsFNV.pas`, `lib/xedit/wbDefinitionsFO3.pas`, `lib/xedit/wbDefinitionsFO4.pas`, `lib/xedit/wbDefinitionsTES3.pas`, `lib/xedit/wbDefinitionsTES4.pas`, `lib/xedit/wbDefinitionsTES5.pas`: Used SupportsAliased on aliased container out-parameters and cast character literals in wbFloat calls to string under Free Pascal.
- `lib/xedit/wbHelpers.pas`: Implemented TRegExpr file mask matching, recursive DeleteDirectory, SHA1/MD5 hashing, TnxFastStringList.DoCompareText, and POSIX FindFirst archive scanning.
- `lib/xedit/wbImplementation.pas`: Declared _AddRef, _Release, InternalAddRef and InternalRelease as cdecl under Free Pascal, provided Pascal implementations for x86 assembly routines, and used SupportsAliased for interface resolution.
- `lib/xedit/wbInterface.pas`: Added TConditionFunc procedural type, SupportsAliased out-parameter helpers, Windows-1252 string conversions, and DoCompareText in TwbFastStringList for Free Pascal.
- `lib/xedit/wbLocalization.pas`: Used PathDelim for string directory paths and implemented case-insensitive localization table file enumeration using FindFirst.
- `lib/xedit/wbStreams.pas`: Replaced Windows file handle operations in TwbBaseCachedFileStream with POSIX FpOpen, FpClose, FpRead, FpWrite, FpLseek, and FpFstat calls.
- `lib/xedit/zlib/ZLibEx.inc`: Defined Delphi compiler compatibility flags under Free Pascal.
- `lib/xedit/zlib/ZLibExApi.pas`: Defined 64-bit C-compatible TZStreamRec record layout and linked system libz dynamically under Free Pascal.
- `src/xeConfiguration.pas`: Used PathDelim directory separators instead of hardcoded backslashes in configuration paths.
- `src/xeConflict.pas`: Initialized ChildNodeArrays elements to nil under Free Pascal.
- `src/xeElementValues.pas`: Cast FormID value to Int64 in IntToHex call for 64-bit Free Pascal compatibility.
- `src/xeElements.pas`: Set CRLF LineBreak on string list and avoided out-parameter aliasing in GetElementGroup using temporary parentElement variable.
- `src/xeErrors.pas`: Guarded Masks unit import and passed explicit Create(False) parameter to TErrorCheckThread.
- `src/xeHelpers.pas`: Implemented GetProgramPath using dladdr, mapped Windows shell folders to macOS user directories, and returned hardcoded 0.6.0.0 version string on POSIX.
- `src/xeMessages.pas`: Assigned ExceptionStack from CurrentExceptionStack under Free Pascal.
- `src/xeMeta.pas`: Qualified Classes.TList type, set CRLF LineBreak on string lists, and used GetProgramPath for ProgramPath global.
- `src/xeSetup.pas`: Installed alternate signal stacks on loader and reference threads, passed Create(False) parameters, implemented FindFirst plugin scanning, and used FormatDateTime.
- `src/xeStackTrace.pas`: Implemented CurrentExceptionStack using Free Pascal BackTraceStrFunc and RaiseList call frames.
- `src/xeTypes.pas`: Overrode DoCompareText in TFastStringList and replaced CompareStrings with CompareStr in IndexOfValue under Free Pascal.

### (b) Parity with Shipped Windows XEditLib.dll 0.6.0.0

- `lib/xedit/wbInterface.pas`: Adjusted floating-point scaling factor for 6 decimal digits (LFactor := 9.999999974752427e-07) to match Windows DLL float precision.
- `src/xeSerialization.pas`: Serialized FormIDs as <File>:<hex6> in JSON, reproduced Windows DLL access violation when importing string FormIDs into record headers, and resolved existing records by FormID only.

### (c) Fixes Applying to Both Compilers

- `lib/xedit/lz4/lz4io.pas`: Matched decodedSize variable type to uint64 in selectDecoder caller to avoid truncation.
- `lib/xedit/zlib/ZLibExApi.pas`: Changed len parameter type to Cardinal in adler32 and crc32 bindings.
- `lib/xedit/zlib/zlibex.pas`: Cast buffer pointer offsets to NativeUInt for 64-bit safety and passed zstream as var parameter in compression and decompression helpers.

## Known Differences

- `GetGameLanguage`: The native build returns the language from installed Skyrim INIs; the Windows DLL in the reference environment (no game install) returns an error for every game mode.
- JSON nesting: Native ElementFromJson handles about 800 levels and returns 'Stack overflow' from about 1200; the Windows DLL handled 2000 and hung at 4000 under Wine. Cause: the FPC build uses more stack per nesting level, and koffi runs synchronous calls on its own stack (koffi.config({ sync_stack_size }) raises it).
- Stack overflow recovery: Thread stack overflow recovery is active for the main process thread and threads created by the library (`TLoaderThread`, `TRefThread`). Stack overflow occurring on external foreign threads created without an alternate stack is terminated by the kernel.
- Dynamic library unloading: `dlclose` leaves the signal fault handler installed to avoid unhooking host handlers if dyld retains image text.
- Data folder: Paths the engine builds contain a lowercase 'data' segment (inherited from upstream), which resolves on case-insensitive file systems only.
