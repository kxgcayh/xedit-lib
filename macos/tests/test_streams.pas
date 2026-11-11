{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_streams.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for stream readers and file stream buffering.

******************************************************************************}

program test_streams;
{$mode delphiunicode}
uses cwstring, SysUtils, Classes, wbStreams;
var w: TwbWriteCachedFileStream; r: TwbReadOnlyCachedFileStream; f: string; i: Integer; v: Cardinal;
begin
  f := GetTempDir + 'xe_stream_test.bin';
  w := TwbWriteCachedFileStream.Create(f, 64, 64, False);
  for i := 0 to 999 do w.WriteCardinal(i * 7);
  w.WriteStringTerm('hello');
  Assert(w.Size = 4006);
  w.Free;
  r := TwbReadOnlyCachedFileStream.Create(f);
  Assert(r.Size = 4006);
  for i := 0 to 999 do begin v := r.ReadCardinal; Assert(v = Cardinal(i * 7)); end;
  Assert(r.ReadStringTerm = 'hello');
  r.Position := 400; Assert(r.ReadCardinal = 100 * 7);
  r.Free; DeleteFile(f);
  WriteLn('streams OK');
end.
