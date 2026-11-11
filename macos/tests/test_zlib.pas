{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_zlib.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for ZLibEx compression and stream decompression.

******************************************************************************}

program test_zlib;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, ZLibEx, ZLibExApi;
var
  src, comp, outb: TBytes;
  ms, cs, ds: TMemoryStream;
  i: Integer;
  s: AnsiString;
  p: Pointer; n: Integer;
begin
  // adler32/crc32 of 'Wikipedia': adler=$11E60398, crc32=$ADAAC02E
  s := 'Wikipedia';
  Assert(Cardinal(ZAdler32(1, s[1], 9)) = $11E60398);
  Assert(Cardinal(ZCrc32(0, s[1], 9)) = $ADAAC02E);

  SetLength(src, 5000);
  for i := 0 to High(src) do src[i] := (i * 7 + i div 13) and $FF;
  ms := TMemoryStream.Create; cs := TMemoryStream.Create; ds := TMemoryStream.Create;
  try
    ms.Write(src[0], Length(src)); ms.Position := 0;
    ZCompressStream(ms, cs);
    Assert((cs.Size > 2) and (cs.Size < 5000));
    Assert(PByte(cs.Memory)^ = $78);
    cs.Position := 0;
    ZDecompressStream(cs, ds);
    Assert(ds.Size = 5000);
    Assert(CompareMem(ds.Memory, @src[0], 5000));
  finally ms.Free; cs.Free; ds.Free; end;

  p := nil; n := 0;
  ZCompress(@src[0], 5000, p, n, zcDefault);
  SetLength(outb, 5000);
  DecompressToUserBuf(p, n, @outb[0], 5000);
  Assert(CompareMem(@outb[0], @src[0], 5000));
  FreeMem(p);

  // zlib of 'abcabcabc' produced by python zlib.compress
  comp := TBytes.Create($78,$9C,$4B,$4C,$4A,$4E,$04,$23,$00,$11,$3D,$03,$73);
  SetLength(outb, 9);
  DecompressToUserBuf(@comp[0], Length(comp), @outb[0], 9);
  Assert((outb[0]=Ord('a')) and (outb[8]=Ord('c')));

  try
    comp[4] := $FF; comp[5] := $FF;
    DecompressToUserBuf(@comp[0], Length(comp), @outb[0], 9);
    Assert(False);
  except on EZDecompressionError do ; end;
  WriteLn('zlib OK');
end.
