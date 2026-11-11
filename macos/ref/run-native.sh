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
# Run native query test against libXEditLib.dylib and diff with reference/expected.json.
#
# Required environment variables:
#   XEDITLIB_PATH: path to libXEditLib.dylib under test (or passed as $1)
#   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
#   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
set -eu
if [ "$#" -ge 1 ]; then
  library="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  export XEDITLIB_PATH="$library"
elif [ -z "${XEDITLIB_PATH:-}" ]; then
  echo 'Usage: ./run-native.sh /path/to/libXEditLib.dylib' >&2
  exit 2
fi
cd "$(dirname "$0")"
export GAME_PATH="$PWD/fixtures"
mkdir -p diagnostics runtime/backups
node query.cjs > diagnostics/native.json 2> diagnostics/native.stderr || true
if ! grep -qx 'RESULT: QUERY PASS' diagnostics/native.stderr; then cat diagnostics/native.stderr >&2; exit 1; fi
node -e 'JSON.parse(require("fs").readFileSync("diagnostics/native.json","utf8"))'
diff -u reference/expected.json diagnostics/native.json
