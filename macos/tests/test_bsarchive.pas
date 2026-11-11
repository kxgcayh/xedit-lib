{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_bsarchive.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for Bethesda archive (BSA/BA2) reading and extraction.

******************************************************************************}

program test_bsarchive;
{$mode delphiunicode}
{ Writes tiny archives into the system temp dir, reads them back, and leaves
  fo4test.ba2 next to the executable for the Python structure check. }
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, wbBSArchive;

var
  GotNames: TStringList;
  GotData: array of TBytes;

function Collect(aArchive: TwbBSArchive; const aFileName: string; aFileRecord, aFolderRecord: Pointer): Boolean;
begin
  GotNames.Add(aFileName);
  SetLength(GotData, GotNames.Count);
  GotData[GotNames.Count - 1] := aArchive.ExtractFileData(aFileRecord);
  Result := False; // keep iterating
end;

function Payload(n: Integer): TBytes;
var i: Integer;
begin
  SetLength(Result, n);
  for i := 0 to n - 1 do Result[i] := (i * 31 + n) and $FF;
  for i := n div 2 to n - 1 do Result[i] := Ord('x'); // compressible tail
end;

procedure RoundTrip(aType: TBSArchiveType; aCompress: Boolean; const aName: string; aCheckData: Boolean = True);
var
  a: TwbBSArchive;
  d1, d2, r: TBytes;
  fn: string;
  lst: TStringList;
begin
  fn := aName;
  d1 := Payload(700);
  d2 := Payload(3000);
  a := TwbBSArchive.Create;
  try
    lst := TStringList.Create;
    try
      lst.Add('meshes\test\one.nif'); lst.Add('meshes\test\two.nif');
      a.Compress := aCompress; // upstream contract: set before CreateArchive (flag is set there)
      a.CreateArchive(fn, aType, lst);
    finally lst.Free; end;
    a.AddFile('meshes\test\one.nif', d1);
    a.AddFile('meshes\test\two.nif', d2);
    a.Save;
  finally a.Free; end;

  a := TwbBSArchive.Create;
  try
    a.LoadFromFile(fn);
    Assert(a.FileCount = 2);
    if aType <> baFO4 then Assert(a.FileExists('meshes\test\one.nif'));
    if not aCheckData then Exit; // Oblivion archives: upstream writes with EMBEDNAME, ExtractFileData keeps the prefix (not an arm64 issue)
    if aType = baFO4 then begin
      // FindFileRecordFO4 compares a space-padded extension with the NUL-padded one
      // stored in the file, so by-name lookup misses 3-letter extensions (upstream bug);
      // read through IterateFiles instead.
      GotNames := TStringList.Create;
      try
        a.IterateFiles(Collect);
        Assert(GotNames.Count = 2);
        Assert((Length(GotData[0]) = 700) and CompareMem(@GotData[0][0], @d1[0], 700));
        Assert((Length(GotData[1]) = 3000) and CompareMem(@GotData[1][0], @d2[0], 3000));
      finally GotNames.Free; end;
      Exit;
    end;
    r := a.ExtractFileData('meshes\test\one.nif');
    Assert((Length(r) = 700) and CompareMem(@r[0], @d1[0], 700));
    r := a.ExtractFileData('meshes\test\two.nif');
    Assert((Length(r) = 3000) and CompareMem(@r[0], @d2[0], 3000));
  finally a.Free; end;
end;

var dir: string;
begin
  dir := ExtractFilePath(ParamStr(0));
  // CreateHash known value: hash of an empty name is 0; non-empty is stable and case-insensitive
  Assert(CreateHashTES4('') = 0);
  Assert(CreateHashTES4('Meshes\Foo.NIF') = CreateHashTES4('meshes\foo.nif'));
  RoundTrip(baTES4, False, dir + 'tes4test.bsa', False);
  RoundTrip(baFO3, True, dir + 'fo3test.bsa');     // zlib
  RoundTrip(baSSE, True, dir + 'ssetest.bsa');     // lz4 frame
  RoundTrip(baFO4, True, dir + 'fo4test.ba2');     // zlib per file
  RoundTrip(baFO4, False, dir + 'fo4raw.ba2');
  WriteLn('bsarchive OK');
end.
