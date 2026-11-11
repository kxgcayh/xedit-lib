#!/bin/sh
# Copyright (C) 2026 kxgcayh. All Rights Reserved.
# The contents of this file are subject to the Mozilla Public License Version 1.1
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy at https://www.mozilla.org/MPL/1.1/.
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
# rights and limitations under the License.
# The Original Code is the macOS XEditLib port test and build tooling.
# The Initial Developer of the Original Code is kxgcayh.
# Builds and runs library unit tests.
# -Sa is required: Free Pascal omits Assert checks without it.
#
# Environment variables:
#   XEDITLIB_PATH: path to libXEditLib.dylib (optional for standalone unit tests)
#   XEDITLIB_JS: path to xeditlib JS wrapper package dir (optional)
#   REAL_STAGE: optional directory with game data (optional)
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
U="lib"
O="macos/tests"
UNITS="${1:-macos/out/libs_units}"
F="-Sa -gl -Mdelphiunicode -dWIN64 -Fumacos/shim"

mkdir -p "$UNITS/zl" "$UNITS/lz" "$UNITS/shim" "$UNITS/argo" "$UNITS/tf" "$UNITS/img" "$UNITS/bsa" "$UNITS/asm" "$UNITS/streams" "$UNITS/case"

/opt/homebrew/bin/fpc $F -Fu$U/xedit/zlib -FE$O -FU"$UNITS/zl" $O/test_zlib.pas >/dev/null || exit 1
$O/test_zlib || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/xedit/lz4 -FE$O -FU"$UNITS/lz" $O/test_lz4.pas >/dev/null || exit 1
(cd $O && ./test_lz4 && lz4 -d -c lz4ours.lz4 | cmp - lz4in.bin) || exit 1

/opt/homebrew/bin/fpc $F -FE$O -FU"$UNITS/shim" $O/test_shims.pas >/dev/null || exit 1
$O/test_shims || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/Argo -FE$O -FU"$UNITS/argo" $O/test_argo.pas >/dev/null || exit 1
$O/test_argo || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/TForge -FE$O -FU"$UNITS/tf" $O/test_tforge.pas >/dev/null || exit 1
$O/test_tforge || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/Imaging -Fu$U/Imaging/ZLib -Fi$U/Imaging -FE$O -FU"$UNITS/img" $O/test_imaging.pas >/dev/null || exit 1
$O/test_imaging || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/BSArch -Fu$U/xedit -Fu$U/xedit/lz4 -Fu$U/xedit/zlib -Fu$U/TForge -Fu$U/Imaging -Fi$U/Imaging -FE$O -FU"$UNITS/bsa" $O/test_bsarchive.pas >/dev/null || exit 1
(cd $O && ./test_bsarchive) || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/xedit -Fu$U/xedit/zlib -Fu$U/xedit/lz4 -Fu$U/Imaging -Fu$U/Imaging/ZLib -Fi$U/Imaging -FE$O -FU"$UNITS/asm" $O/test_asm_replacements.pas >/dev/null || exit 1
$O/test_asm_replacements || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/xedit -FE$O -FU"$UNITS/streams" $O/test_streams.pas >/dev/null || exit 1
$O/test_streams || exit 1

/opt/homebrew/bin/fpc $F -Fu$U/xedit -Fu$U/xedit/zlib -Fu$U/xedit/lz4 -Fu$U/Imaging -Fu$U/Imaging/ZLib -Fi$U/Imaging -FE$O -FU"$UNITS/case" $O/test_case_wildcards.pas >/dev/null || exit 1
$O/test_case_wildcards || exit 1
