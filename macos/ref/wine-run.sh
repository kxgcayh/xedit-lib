#!/bin/bash
# Copyright (C) 2026 kxgcayh. All Rights Reserved.
# The contents of this file are subject to the Mozilla Public License Version 1.1
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy at https://www.mozilla.org/MPL/1.1/.
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
# rights and limitations under the License.
# The Original Code is the macOS XEditLib port test and build tooling.
# The Initial Developer of the Original Code is kxgcayh.
# Run a node script under Wine for reference capture against Windows XEditLib.dll.
#
# Required environment variables:
#   WINE_LOADER: wineloader executable (e.g. wine64 or wineloader)
#   WINE_NODE: Windows node.exe path
#   XEDITLIB_DLL: Windows XEditLib.dll path
#   XEDITLIB_PATH: dylib under test
#   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
#   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
set -u
cd "$(dirname "$0")"
root="$(pwd -P)"
export WINEPREFIX="${WINEPREFIX:-$root/runtime/prefix}"
export WINEARCH="${WINEARCH:-win64}"
export WINEDEBUG="${WINEDEBUG:--all}"
export TMPDIR="$root/runtime" TEMP="$root/runtime" TMP="$root/runtime"
export GAME_PATH="Z:$root/fixtures"
loader="${WINE_LOADER:-wine64}"
node_bin="${WINE_NODE:-node.exe}"
export XEDITLIB_PATH="${XEDITLIB_DLL:-XEditLib.dll}"
exec "$loader" "$node_bin" "Z:$root/$1" "${@:2}"
