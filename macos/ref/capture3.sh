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
# Capture the stage-3 reference from the Windows XEditLib.dll under Wine (via wine-run.sh).
# Every group runs twice; reference3/<group>.json is only kept if both runs exit 0 and are
# byte-identical. Usage: ./capture3.sh [group ...]   (default: all groups in suite3/groups.txt)
#
# Required environment variables:
#   WINE_LOADER: path to wineloader (e.g. wine64)
#   WINE_NODE: Windows node.exe path
#   XEDITLIB_DLL: Windows XEditLib.dll path
#   XEDITLIB_PATH: dylib under test
#   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
#   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt
cd "$(dirname "$0")"
mkdir -p reference3 runtime/out3 runtime/cover
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=($(cat suite3/groups.txt))
fail=0
for g in "${groups[@]}"; do
  ./wine-run.sh suite3/$g.cjs > runtime/out3/$g.1.json 2> runtime/out3/$g.1.err; rc1=$?
  ./wine-run.sh suite3/$g.cjs > runtime/out3/$g.2.json 2> runtime/out3/$g.2.err; rc2=$?
  if [ $rc1 -eq 0 ] && [ $rc2 -eq 0 ] && cmp -s runtime/out3/$g.1.json runtime/out3/$g.2.json && [ -s runtime/out3/$g.1.json ]; then
    cp runtime/out3/$g.1.json reference3/$g.json; echo "$g: OK ($(wc -c < reference3/$g.json) bytes, byte-identical twice)"
  else echo "$g: FAILED rc=$rc1/$rc2 identical=$(cmp -s runtime/out3/$g.1.json runtime/out3/$g.2.json && echo yes || echo no)"; fail=1; fi
done
exit $fail
