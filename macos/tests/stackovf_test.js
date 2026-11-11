/*
Copyright (C) 2026 kxgcayh. All Rights Reserved.
The contents of this file are subject to the Mozilla Public License Version 1.1
(the "License"); you may not use this file except in compliance with the License.
You may obtain a copy at https://www.mozilla.org/MPL/1.1/.
Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
rights and limitations under the License.
The Original Code is the macOS XEditLib port test and build tooling.
The Initial Developer of the Original Code is kxgcayh.
*/
// Stack overflow recovery test: ensures recursion faults convert to EStackOverflow cleanly.
//
// Required environment variables:
//   XEDITLIB_PATH: path to libXEditLib.dylib under test
//   XEDITLIB_JS: path to xeditlib JS wrapper package dir (default: require('xeditlib') via NODE_PATH)
//   REAL_STAGE: optional dir with Data/Skyrim.esm, Data/Update.esm, plugins.txt

const koffi = require('koffi');
const path = require('path');

const dylibPath = process.env.XEDITLIB_PATH || path.resolve(__dirname, '../out/libXEditLib.dylib');
console.log('Testing stack overflow recovery against:', dylibPath);

const lib = koffi.load(dylibPath);
const InitXEdit = lib.func('void InitXEdit()');
const CloseXEdit = lib.func('void CloseXEdit()');
const ElementFromJson = lib.func('uint16 ElementFromJson(uint32, str16, str16)');
const GetExceptionMessageLength = lib.func('void GetExceptionMessageLength(_Out_ int*)');
const GetExceptionMessage = lib.func('uint16 GetExceptionMessage(_Out_ uint16*, int)');

function getExceptionMessage() {
  const lenBuf = [0];
  GetExceptionMessageLength(lenBuf);
  const len = lenBuf[0];
  if (len < 1) return '';
  const buf = new Uint16Array(len + 1);
  GetExceptionMessage(buf, len);
  return String.fromCharCode.apply(null, buf.subarray(0, len));
}

InitXEdit();

const depth = 2000;
const deepJson = '{"a":'.repeat(depth);

for (let run = 1; run <= 2; run++) {
  console.log(`[Run ${run}] Invoking ElementFromJson with deep recursion (depth ${depth})...`);
  const result = ElementFromJson(0, '', deepJson);
  const msg = getExceptionMessage();

  console.log(`[Run ${run}] ElementFromJson returned: ${result}, ExceptionMessage: "${msg}"`);
  if (result !== 0) {
    console.error(`FAIL: expected ElementFromJson to return 0 on stack overflow, got ${result}`);
    process.exit(1);
  }
  if (msg !== 'Stack overflow') {
    console.error(`FAIL: expected "Stack overflow", got "${msg}"`);
    process.exit(1);
  }
}

CloseXEdit();
console.log('PASS: stack overflow caught and recovered cleanly twice in one process');
