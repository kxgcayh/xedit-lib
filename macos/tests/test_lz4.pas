{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_lz4.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for LZ4 compression and decompression routines.

******************************************************************************}

program test_lz4;
{$mode delphiunicode}
{ Needs lz4in.bin and lz4ref.lz4 (made by the lz4 CLI) next to the executable. }
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, xxHash, lz4, lz4io;

function Digest32(const b: TBytes; seed: Cardinal): Cardinal;
begin
  Result := XXH32(@b[0], Length(b), seed);
end;

function Digest64(const b: TBytes): UInt64;
var st: PXXH64_state_t;
begin
  st := XXH64_createState;
  XXH64_reset(st, 0);
  XXH64_update(st, @b[0], Length(b));
  Result := XXH64_digest(st);
  XXH64_freeState(st);
end;

function Bytes(const s: AnsiString): TBytes;
begin
  SetLength(Result, Length(s));
  if s <> '' then Move(s[1], Result[0], Length(s));
end;

var
  dir: string;
  d, e: TBytes;
  i: Integer;
  fs: TFileStream;
  src, cmp: TMemoryStream;
  blk: array[0..12] of Byte;
  o: array[0..15] of Byte;
  hundred: TBytes;
  tmp: AnsiString;
begin
  dir := ExtractFilePath(ParamStr(0));

  // xxHash vectors: empty/'a'/'abc' are the published ones; the 100-byte row
  // exercises the 16/32-byte stripe loops (rotl) and was cross-checked with an
  // independent Python implementation.
  tmp := 'a';   Assert(Digest32(Bytes(tmp), 0) = $550D7456); Assert(Digest64(Bytes(tmp)) = $D24EC4F1A98C6E5B);
  tmp := 'abc'; Assert(Digest32(Bytes(tmp), 0) = $32D153FF); Assert(Digest64(Bytes(tmp)) = $44BC2CF5AD770999);
  SetLength(hundred, 100);
  for i := 0 to 99 do hundred[i] := i;
  Assert(Digest32(hundred, 0) = $7F89BA44);
  Assert(Digest32(hundred, $9E3779B1) = $FA996F24);
  Assert(Digest64(hundred) = $6AC1E58032166597);
  Assert(XXH32(@tmp, 0, 0) = $02CC5D05);

  WriteLn('A');
  // hand-built block: 4 literals, match(offset 4,len 4), 5 literals
  blk[0]:=$40; blk[1]:=$61; blk[2]:=$62; blk[3]:=$63; blk[4]:=$64; blk[5]:=4; blk[6]:=0;
  blk[7]:=$50; blk[8]:=$68; blk[9]:=$65; blk[10]:=$6C; blk[11]:=$6C; blk[12]:=$6F;
  FillChar(o, SizeOf(o), 0);
  Assert(LZ4_decompress_safe(@blk[0], @o[0], 13, 16) = 13);
  Assert(CompareMem(@o[0], PAnsiChar('abcdabcdhello'), 13));

  WriteLn('B');
  // frame written by the lz4 CLI (level 1) decodes to the original
  fs := TFileStream.Create(dir + 'lz4in.bin', fmOpenRead); SetLength(d, fs.Size); fs.Read(d[0], fs.Size); fs.Free;
  fs := TFileStream.Create(dir + 'lz4ref.lz4', fmOpenRead); SetLength(e, fs.Size); fs.Read(e[0], fs.Size); fs.Free;
  SetLength(hundred, Length(d));
  lz4DecompressToUserBuf(@e[0], Length(e), @hundred[0], Length(d));
  Assert(CompareMem(@hundred[0], @d[0], Length(d)));

  WriteLn('C');
  // our compressor roundtrips, and its output is written for `lz4 -d` to check
  src := TMemoryStream.Create; cmp := TMemoryStream.Create;
  src.Write(d[0], Length(d)); src.Position := 0;
  lz4CompressStream(src, cmp, 8);
  Assert(cmp.Size > 0);
  cmp.SaveToFile(dir + 'lz4ours.lz4');
  FillChar(hundred[0], Length(hundred), 0);
  lz4DecompressToUserBuf(cmp.Memory, cmp.Size, @hundred[0], Length(d));
  Assert(CompareMem(@hundred[0], @d[0], Length(d)));
  src.Free; cmp.Free;
  // fast (non-HC) block compressor roundtrip
  SetLength(e, LZ4_compressBound(Length(d)));
  i := LZ4_compress(@d[0], @e[0], Length(d));
  Assert((i > 0) and (i < Length(d)));
  FillChar(hundred[0], Length(hundred), 0);
  Assert(LZ4_decompress_safe(@e[0], @hundred[0], i, Length(d)) = Length(d));
  Assert(CompareMem(@hundred[0], @d[0], Length(d)));
  WriteLn('lz4 OK');
end.
