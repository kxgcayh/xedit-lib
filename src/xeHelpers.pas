// Modified 2026-11-11 by kxgcayh: macOS arm64 port (Free Pascal 3.2.2).
// Derived from XEditLib Original Code provided by Initial Developer matortheeternal.
// Changes are documented in macos/CHANGES.md; distributed under MPL 1.1.
unit xeHelpers;

interface

uses
  Windows, SysUtils, Classes,
  // xedit units
  wbInterface;

  function StrEndsWith(str, substr: String): Boolean;
  function GetCSIDLShellFolder(CSIDLFolder: integer): string;
  function TryRegistryKeys(var keys: TStringList): string;
  function GetVersionMem: string;
  function FileNameValid(filename: string): boolean;
  function StrArrayJoin(ary: TDynStrings; const separator: String): String;
  // Directory (with trailing separator) of the loaded library; ParamStr(0) in Delphi
  function GetProgramPath: String;

{$IFDEF FPC}
const
  // ShlObj values kept so callers stay unchanged; mapped to POSIX folders below
  CSIDL_PERSONAL = $0005;
  CSIDL_LOCAL_APPDATA = $001C;
{$ENDIF}

implementation

uses
  {$IFDEF FPC}
  StrUtils;
  {$ELSE}
  StrUtils, IOUtils, ShellApi, shlObj, Registry;
  {$ENDIF}

{$IFDEF FPC}
type
  Tdl_info = record
    dli_fname: PAnsiChar;
    dli_fbase: Pointer;
    dli_sname: PAnsiChar;
    dli_saddr: Pointer;
  end;

function dladdr(addr: Pointer; var info: Tdl_info): Integer; cdecl; external 'c' name 'dladdr';

// Under Node, ParamStr(0) is the node binary, so locate this dylib instead.
function GetProgramPath: String;
var
  info: Tdl_info;
begin
  Result := '';
  if (dladdr(@GetProgramPath, info) <> 0) and (info.dli_fname <> nil) then
    Result := ExtractFilePath(ExpandFileName(UTF8ToString(info.dli_fname)));
end;
{$ELSE}
function GetProgramPath: String;
begin
  Result := ExtractFilePath(ParamStr(0));
end;
{$ENDIF}

function StrEndsWith(str, substr: String): Boolean;
var
  len, subLen: Integer;
begin
  Result := False;
  len := Length(str);
  subLen := Length(substr);
  if (len < subLen) then exit;
  Result :=  Copy(str, len - subLen + 1, subLen) = substr;
end;

function StrArrayJoin(ary: TDynStrings; const separator: String): String;
var
  len, i: Integer;
begin
  Result := '';
  len := Length(ary);
  if len > 0 then
    Result := ary[0];
  for i := 1 to Pred(len) do
    Result := Result + #13#10 + ary[i];
end;

{
  GetCSIDLShellFolder:
  Gets a folder by its integer CSID.
}
function GetCSIDLShellFolder(CSIDLFolder: integer): string;
begin
  {$IFDEF FPC}
  Result := '';
  case CSIDLFolder of
    CSIDL_PERSONAL:      Result := GetUserDir + 'Documents';
    CSIDL_LOCAL_APPDATA: Result := GetUserDir + 'Library/Application Support';
  end;
  if (Result <> '') then
    Result := IncludeTrailingPathDelimiter(Result);
  {$ELSE}
  SetLength(Result, MAX_PATH);
  SHGetSpecialFolderPath(0, PChar(Result), CSIDLFolder, True);
  SetLength(Result, StrLen(PChar(Result)));
  if (Result <> '') then
    Result := IncludeTrailingBackslash(Result);
  {$ENDIF}
end;

{
  TryRegistryKeys:
  Tries to load various registry keys.
}
function TryRegistryKeys(var keys: TStringList): string;
var
  i: Integer;
  path, name: string;
begin
  Result := '';
  {$IFNDEF FPC} // no registry on POSIX: game path must come from SetGamePath
  with TRegistry.Create do try
    RootKey := HKEY_LOCAL_MACHINE;

    // try all keys
    for i := 0 to Pred(keys.Count) do begin
      path := ExtractFilePath(keys[i]);
      name := ExtractFileName(keys[i]);
      if OpenKeyReadOnly(path) then begin
        Result := ReadString(name);
        break;
      end;
    end;
  finally
    Free;
  end;
  {$ENDIF}
end;

{ Get program version from memory }
{$IFDEF FPC}
function GetVersionMem: string;
begin
  // no PE version resource on POSIX
  Result := '0.6.0.0'; // matches the shipped XEditLib.dll version resource
end;
{$ELSE}
function GetVersionMem: string;
var
  verblock: PVSFIXEDFILEINFO;
  versionMS, versionLS, verlen: cardinal;
  rs: TResourceStream;
  m: TMemoryStream;
begin
  m := TMemoryStream.Create;
  try
    try
      rs := TResourceStream.CreateFromID(HInstance, 1, RT_VERSION);
      try
        m.CopyFrom(rs, rs.Size);
      finally
        rs.Free;
      end;
      m.Position := 0;
      if VerQueryValue(m.Memory, '\', Pointer(verblock), verlen) then begin
        VersionMS := verblock.dwFileVersionMS;
        VersionLS := verblock.dwFileVersionLS;
        Result := Format('%s.%s.%s.%s', [IntToStr(versionMS shr 16),
          IntToStr(versionMS and $FFFF), IntToStr(VersionLS shr 16),
          IntToStr(VersionLS and $FFFF)]);
      end;
    except
      on x: Exception do
        Result := '0.0.0.0';
    end;
  finally
    m.Free;
  end;
end;
{$ENDIF}

{
  FileNameValid:
  Returns true if the input filename is valid.
}
function FileNameValid(filename: string): boolean;
{$IFDEF FPC}
var
  c: Char;
begin
  // same invalid set as IOUtils.TPath.HasValidFileNameChars on Windows, so plugin names behave the same
  Result := (Length(Trim(filename)) > 0) and (Pos('/', filename) = 0) and (Pos('\', filename) = 0) and
    (Pos(':', filename) = 0) and (Pos('*', filename) = 0) and (Pos('?', filename) = 0) and
    (Pos('"', filename) = 0) and (Pos('<', filename) = 0) and (Pos('>', filename) = 0) and
    (Pos('|', filename) = 0);
  if Result then
    for c in filename do
      if c < #32 then
        Exit(False);
end;
{$ELSE}
begin
  Result := (Length(Trim(filename)) > 0) and
    TPath.HasValidFileNameChars(filename, false);
end;
{$ENDIF}

end.
