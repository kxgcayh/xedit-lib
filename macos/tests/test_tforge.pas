{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_tforge.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for cryptographic hash and cipher routines using TForge.

******************************************************************************}

program test_tforge;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, tfTypes, tfMD5;

function Hex(const d: TMD5Digest): string;
var i: Integer; p: PByte;
begin
  Result := ''; p := @d;
  for i := 0 to 15 do Result := Result + LowerCase(IntToHex(p[i], 2));
end;

function MD5Of(const b: TBytes): string;
var alg: PMD5Alg; d: TMD5Digest;
begin
  alg := nil;
  Assert(GetMD5Algorithm(alg) = TF_S_OK);
  if Length(b) > 0 then TMD5Alg.Update(alg, @b[0], Length(b));
  TMD5Alg.Done(alg, @d);
  Result := Hex(d);
  FreeMem(alg);
end;

var
  b: TBytes; i: Integer;
begin
  Assert(MD5Of(nil) = 'd41d8cd98f00b204e9800998ecf8427e');
  b := TBytes.Create(Ord('a'), Ord('b'), Ord('c'));
  Assert(MD5Of(b) = '900150983cd24fb0d6963f7d28e17f72');
  SetLength(b, 200);
  for i := 0 to 199 do b[i] := i;
  Assert(MD5Of(b) = 'fb7001d34b8e82c9b579be5005d5b0a5');
  SetLength(b, 1000);
  FillChar(b[0], 1000, Ord('a'));
  Assert(MD5Of(b) = 'cabe45dcc9ae5b66ba86600cca6b8ba8');
  WriteLn('tforge OK');
end.
