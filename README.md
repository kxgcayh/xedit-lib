# xedit-lib
Project to make a DLL exposing XEdit functionality to an application in any language.

# contact
If you're looking for support or want to contribute, join the [Modding Tools discord server](https://discord.gg/GUfRdpT).

You can view project progress and user stories on the [trello board](https://trello.com/b/Hkd7Ki2F/xeditlib).

## macOS arm64 port

### Status
Validated against the Windows XEditLib.dll 0.6.0.0:
- Native-vs-Windows-DLL diff suites over small fixtures (`macos/ref/run-native.sh` and `macos/ref/run-native3.sh`).
- Real Skyrim.esm and Update.esm queries matching the Windows DLL under Wine: skyrim-winner conflicts, winner and chain produced identical output; conflicts over Skyrim.esm covered 869,687 records with 5,655 overridden by Update.esm.

### Requirements
- macOS arm64 (Apple Silicon)
- Free Pascal 3.2.2 via Homebrew (`/opt/homebrew/bin/fpc`)
- Node.js 20+ and the `xeditlib` JavaScript wrapper package for Node-based tests
- CrossOver or Wine (only required if regenerating reference outputs from the Windows DLL)

### Build
Run from the repository root:
```sh
macos/build.sh
```
Build output is written to `macos/out/libXEditLib.dylib`.
At runtime, the library requires the game's `*.Hardcoded.dat` file (hardcoded records, e.g. `Skyrim.Hardcoded.dat`) located in the same directory as the dynamic library.

Optional build arguments:
```sh
macos/build.sh [unit-output-dir] [output-dir]
```

### Tests
- Library unit test suite:
  ```sh
  macos/tests/run_libs_tests.sh
  ```
- Native reference diff suite:
  ```sh
  macos/ref/run-native.sh macos/out/libXEditLib.dylib
  macos/ref/run-native3.sh macos/out/libXEditLib.dylib
  ```
- Node test harness:
  ```sh
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/node_exit_test.js
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/formid_numeric_test.js
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/formid_roundtrip_test.js
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/reclaim_test.js
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/stackovf_test.js
  XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/wildcard_case_test.js
  ```
- Opt-in real master tests (requires `REAL_STAGE` pointing to directory with `Data/Skyrim.esm`, `Data/Update.esm`, `plugins.txt`):
  ```sh
  REAL_STAGE=/path/to/stage XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/cellread_test.js
  REAL_STAGE=/path/to/stage XEDITLIB_PATH="$PWD/macos/out/libXEditLib.dylib" node macos/tests/reclaim_real_test.js
  ```

### Known differences
- `GetGameLanguage`: The native build returns the language from installed Skyrim INIs; the Windows DLL in the reference environment (no game install) returns an error for every game mode.
- JSON nesting: Native ElementFromJson handles about 800 levels and returns 'Stack overflow' from about 1200; the Windows DLL handled 2000 and hung at 4000 under Wine. Cause: the FPC build uses more stack per nesting level, and koffi runs synchronous calls on its own stack (koffi.config({ sync_stack_size }) raises it).
- Data folder: Paths the engine builds contain a lowercase 'data' segment (inherited from upstream), which resolves on case-insensitive file systems only.

Detailed technical notes on behavior and compiler differences are documented in [macos/CHANGES.md](macos/CHANGES.md).

## Credits and licences

- XEditLib by matortheeternal: Mozilla Public License 1.1 (license.txt).
- xEdit by ElminsterAU, Sharlikran, Zilav, Hlp and contributors: Mozilla Public License 1.1.
- Argo by Colin (matortheeternal): MIT (https://github.com/matortheeternal/argo/blob/master/LICENSE).
- BSArch by Zilav: Mozilla Public License 1.1 (lib/BSArch/wbBSArchive.pas).
- Vampyre Imaging Library by Marek Mauder: Mozilla Public License 1.1 or LGPL (lib/Imaging/Imaging.pas).
- Imaging PasZLib by Jacques Nomssi Nzali, based on zlib by Jean-loup Gailly and Mark Adler: zlib licence (lib/Imaging/ZLib/readme.txt; dzlib.pas also credits Borland International).
- mteHelpers by matortheeternal: Mozilla Public License 1.1 (distributed with xedit-lib and merge-plugins).
- TForge by Sergey Kasandrov: Apache License 2.0 (https://github.com/sergworks/tforge/blob/master/LICENSE).
- Mahogany by Colin (matortheeternal): MIT (https://github.com/matortheeternal/mahogany/blob/master/LICENSE).
- LZ4 and xxHash by Yann Collet, Delphi port by Jose Pascoa: BSD 2-Clause (lib/xedit/lz4/lz4.pas).
- ZLibEx by Brent Sherwood / base2 technologies, with Borland Software Corporation copyright: zlib-style permissive licence (https://github.com/BrentSherwood/DelphiZLib/blob/main/README.txt).
- zlib C library by Jean-loup Gailly and Mark Adler: zlib licence.
- macOS port changes by kxgcayh: Mozilla Public License 1.1 (macos/CHANGES.md).
