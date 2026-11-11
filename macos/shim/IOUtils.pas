{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is IOUtils.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi System.IOUtils (TPath, TFile, TDirectory) on Free Pascal.

******************************************************************************}

unit IOUtils;
{ Shim for Delphi's System.IOUtils on FPC 3.2.2. Only what the xedit-lib
  sources use: TPath.HasExtension/GetTempPath/HasValidFileNameChars,
  TFile.Copy/ReadAllLines/Exists, TDirectory.Exists/GetFiles. }
{$mode delphiunicode}
interface

uses SysUtils, Classes, Types{$IFDEF UNIX}, BaseUnix{$ENDIF};

type
  TSearchOption = (soTopDirectoryOnly, soAllDirectories);

  TPath = class
  public
    class function HasExtension(const Path: string): Boolean; static;
    class function GetTempPath: string; static;
    class function HasValidFileNameChars(const FileName: string; const UseWildcards: Boolean): Boolean; static;
  end;

  TFile = class
  public
    class function Exists(const Path: string): Boolean; static;
    class procedure Copy(const SourceFileName, DestFileName: string; const Overwrite: Boolean); static;
    class function ReadAllLines(const Path: string): TStringDynArray; static;
  end;

  TDirectory = class
  public
    class function Exists(const Path: string): Boolean; static;
    class function GetFiles(const Path, SearchPattern: string; const SearchOption: TSearchOption): TStringDynArray; static;
  end;

implementation

class function TPath.HasExtension(const Path: string): Boolean;
var
  i: Integer;
begin
  // Delphi: a '.' after the last path delimiter, and not the last character.
  Result := False;
  if (Path = '') or (Path[Length(Path)] = '.') then
    Exit(False);
  for i := Length(Path) - 1 downto 1 do
    if Path[i] = '.' then
      Exit(True)
    else if Path[i] in ['/', '\', ':'] then
      Exit(False);
end;

class function TPath.GetTempPath: string;
begin
  Result := GetTempDir(True);
end;

class function TPath.HasValidFileNameChars(const FileName: string; const UseWildcards: Boolean): Boolean;
var
  c: Char;
begin
  // Windows rules on purpose: plugin and archive names must stay portable.
  Result := True;
  for c in FileName do
    if (c < ' ') or (c in ['"', '<', '>', '|', ':', '/', '\']) or
       (not UseWildcards and (c in ['*', '?'])) then
      Exit(False);
end;

class function TFile.Exists(const Path: string): Boolean;
begin
  Result := FileExists(Path);
end;

class procedure TFile.Copy(const SourceFileName, DestFileName: string; const Overwrite: Boolean);
var
  src, dst: TFileStream;
begin
  if (not Overwrite) and FileExists(DestFileName) then
    raise EInOutError.CreateFmt('File "%s" already exists', [DestFileName]);
  src := TFileStream.Create(SourceFileName, fmOpenRead or fmShareDenyWrite);
  try
    dst := TFileStream.Create(DestFileName, fmCreate);
    try
      dst.CopyFrom(src, 0);
    finally
      dst.Free;
    end;
  finally
    src.Free;
  end;
end;

class function TFile.ReadAllLines(const Path: string): TStringDynArray;
var
  sl: TStringList;
  i: Integer;
begin
  sl := TStringList.Create;
  try
    sl.LoadFromFile(Path);
    SetLength(Result, sl.Count);
    for i := 0 to sl.Count - 1 do
      Result[i] := sl[i];
  finally
    sl.Free;
  end;
end;

class function TDirectory.Exists(const Path: string): Boolean;
begin
  Result := DirectoryExists(Path);
end;

{$IFDEF UNIX}
function IsSymLink(const Path: string): Boolean;
var
  st: Stat;
  raw: RawByteString;
begin
  raw := UTF8Encode(Path);
  Result := (FpLstat(PAnsiChar(raw), st) = 0) and FpS_ISLNK(st.st_mode);
end;
{$ENDIF}

procedure Collect(const Dir, Pattern: string; Recurse: Boolean; var Res: TStringDynArray);
var
  sr: TSearchRec;
  mask, subDir: string;
begin
  if Pattern = '*.*' then mask := '*' else mask := Pattern; // Windows '*.*' means any name
  if FindFirst(IncludeTrailingPathDelimiter(Dir) + mask, faAnyFile and not faDirectory, sr) = 0 then
    try
      repeat
        SetLength(Res, Length(Res) + 1);
        Res[High(Res)] := IncludeTrailingPathDelimiter(Dir) + sr.Name;
      until FindNext(sr) <> 0;
    finally
      FindClose(sr);
    end;
  if Recurse and (FindFirst(IncludeTrailingPathDelimiter(Dir) + '*', faDirectory, sr) = 0) then
    try
      repeat
        if (sr.Attr and faDirectory <> 0) and (sr.Name <> '.') and (sr.Name <> '..') then
        begin
          subDir := IncludeTrailingPathDelimiter(Dir) + sr.Name;
          {$IFDEF UNIX}
          if not IsSymLink(subDir) then
          {$ENDIF}
            Collect(subDir, Pattern, True, Res);
        end;
      until FindNext(sr) <> 0;
    finally
      FindClose(sr);
    end;
end;

class function TDirectory.GetFiles(const Path, SearchPattern: string; const SearchOption: TSearchOption): TStringDynArray;
begin
  Result := nil;
  Collect(Path, SearchPattern, SearchOption = soAllDirectories, Result);
end;

end.
