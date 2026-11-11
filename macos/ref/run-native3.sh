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
# Run the stage-3 suite against a native libXEditLib.dylib and diff it with reference3/.
# Usage: ./run-native3.sh /absolute/path/libXEditLib.dylib [group ...]
#
# Required environment variables:
#   XEDITLIB_PATH: path to libXEditLib.dylib under test (or passed as $1)
#   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
#   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
#
# Prints a per-group PASS / DIFF / CRASH table; exits 1 if any group is not PASS, 2 on usage error.
#   PASS  = exit 0, JSON output byte-identical to reference3/<group>.json
#   DIFF  = exit 0 but output differs (unified diff in diagnostics3/<group>.diff)
#   CRASH = non-zero exit, timeout, or no JSON output (stderr in diagnostics3/<group>.stderr)
set -u
if [ "$#" -ge 1 ]; then
  library="$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")"
  shift
elif [ -n "${XEDITLIB_PATH:-}" ]; then
  library="$XEDITLIB_PATH"
else
  echo 'Usage: ./run-native3.sh /path/to/libXEditLib.dylib [group ...]' >&2
  exit 2
fi
cd "$(dirname "$0")"
[ -f "$library" ] || { echo "no such library: $library" >&2; exit 2; }
root="$(pwd -P)"
export XEDITLIB_PATH="$library" GAME_PATH="$root/fixtures"
limit="${GROUP_TIMEOUT:-180}"
mkdir -p diagnostics3 runtime/native3
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=($(cat suite3/groups.txt))
bad=0
printf '%-36s %s\n' GROUP RESULT
for g in "${groups[@]}"; do
  out="runtime/native3/$g.json"; err="diagnostics3/$g.stderr"; rm -f "$out" "diagnostics3/$g.diff"
  node "suite3/$g.cjs" > "$out" 2> "$err" & pid=$!
  ( sleep "$limit"; kill -9 "$pid" 2>/dev/null ) & killer=$!
  wait "$pid" 2>/dev/null; rc=$?
  kill "$killer" 2>/dev/null; wait "$killer" 2>/dev/null
  if [ "$rc" -ne 0 ] || [ ! -s "$out" ]; then res="CRASH (exit $rc)"; bad=1
  elif cmp -s "$out" "reference3/$g.json"; then res=PASS
  else res="DIFF"; bad=1; diff -u "reference3/$g.json" "$out" > "diagnostics3/$g.diff"; res="DIFF ($(grep -c '^[-+][^-+]' "diagnostics3/$g.diff") changed lines, diagnostics3/$g.diff)"; fi
  printf '%-36s %s\n' "$g" "$res"
done
[ "$bad" -eq 0 ] && echo 'ALL GROUPS PASS' || echo 'DIFFERENCES FOUND'
exit "$bad"
