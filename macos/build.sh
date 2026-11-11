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
# Build libXEditLib.dylib (arm64, FPC 3.2.2). Usage: macos/build.sh [unit-output-dir] [output-dir]
# Default unit dir: macos/out/units. Default output: macos/out/libXEditLib.dylib
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
UNITS="${1:-macos/out/units}"
OUTDIR="${2:-macos/out}"
mkdir -p "$OUTDIR"
mkdir -p "$UNITS"
# -Sa: assertions on, like the Delphi DLL (callers see 'Assertion failure' errors).
# -dWIN64: pointer-sized (64-bit) code paths of the Delphi sources.
/opt/homebrew/bin/fpc $FPC_EXTRA -Mdelphiunicode -Sa -Sh -Se500 -dWIN64 \
  -k-install_name -k@rpath/libXEditLib.dylib \
  -Fumacos/shim -Fulib/xedit -Fulib/xedit/zlib -Fulib/xedit/lz4 \
  -Fu/opt/homebrew/lib/fpc/3.2.2/units/aarch64-darwin/paszlib \
  -Fusrc -Fulib/Imaging -Fulib/Imaging/ZLib -Filib/Imaging -Fulib/Argo -Fulib/mte -Fulib/TForge -Fulib/BSArch \
  -FE"$OUTDIR" -FU"$UNITS" -vewn XEditLib.dpr
