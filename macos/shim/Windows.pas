{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is Windows.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Windows API types and functions for POSIX compilation.

******************************************************************************}

unit Windows;
{ Minimal stand-in for the Delphi/FPC Windows unit on POSIX hosts.
  Only what the XEditLib sources use. Grow on demand. }
{$mode delphiunicode}
interface
type
  DWORD = Cardinal; BOOL = LongBool; THandle = NativeUInt; HMODULE = NativeUInt;

const
  INVALID_HANDLE_VALUE = THandle(-1);
  MAX_PATH = 260;
  MB_OK = 0;

var
  MainInstance: HMODULE = 0; // Imaging passes it to GetModuleFileName; unused here
  DebugHook: Byte = 0; // Delphi System.DebugHook; never attached to a debugger here

function CopyFile(lpExistingFileName, lpNewFileName: PWideChar; bFailIfExists: BOOL): BOOL;
// Used by Imaging (ImagingUtility) when MSWINDOWS is defined by its options include.
function QueryPerformanceCounter(out lpPerformanceCount: Int64): BOOL;
function QueryPerformanceFrequency(out lpFrequency: Int64): BOOL;
function GetModuleFileName(hModule: HMODULE; lpFilename: PWideChar; nSize: DWORD): DWORD; overload;
function GetModuleFileName(hModule: HMODULE; lpFilename: PAnsiChar; nSize: DWORD): DWORD; overload;
function GetActiveWindow: THandle;
function MessageBox(hWnd: THandle; lpText, lpCaption: PWideChar; uType: Cardinal): Integer; overload;
function MessageBox(hWnd: THandle; lpText, lpCaption: PAnsiChar; uType: Cardinal): Integer; overload;

implementation
uses Classes, SysUtils, BaseUnix, Unix, UnixType;

function QueryPerformanceCounter(out lpPerformanceCount: Int64): BOOL;
var
  tv: timeval;
begin
  fpgettimeofday(@tv, nil);
  lpPerformanceCount := Int64(tv.tv_sec) * 1000000000 + Int64(tv.tv_usec) * 1000; // 1 GHz counter
  Result := True;
end;

function QueryPerformanceFrequency(out lpFrequency: Int64): BOOL;
begin
  lpFrequency := 1000000000;
  Result := True;
end;

function GetModuleFileName(hModule: HMODULE; lpFilename: PWideChar; nSize: DWORD): DWORD;
var
  s: UnicodeString;
begin
  s := UnicodeString(ParamStr(0));
  if nSize = 0 then Exit(0);
  if Cardinal(Length(s)) >= nSize then SetLength(s, nSize - 1);
  if Length(s) > 0 then Move(s[1], lpFilename^, Length(s) * SizeOf(WideChar));
  lpFilename[Length(s)] := #0;
  Result := Length(s);
end;

function GetModuleFileName(hModule: HMODULE; lpFilename: PAnsiChar; nSize: DWORD): DWORD;
var
  s: AnsiString;
begin
  s := AnsiString(ParamStr(0));
  if nSize = 0 then Exit(0);
  if Cardinal(Length(s)) >= nSize then SetLength(s, nSize - 1);
  if Length(s) > 0 then Move(s[1], lpFilename^, Length(s));
  lpFilename[Length(s)] := #0;
  Result := Length(s);
end;

function GetActiveWindow: THandle;
begin
  Result := 0;
end;

function MessageBox(hWnd: THandle; lpText, lpCaption: PAnsiChar; uType: Cardinal): Integer;
begin
  WriteLn(StdErr, AnsiString(lpCaption) + ': ' + AnsiString(lpText));
  Result := 1;
end;

function MessageBox(hWnd: THandle; lpText, lpCaption: PWideChar; uType: Cardinal): Integer;
begin
  WriteLn(StdErr, UnicodeString(lpCaption) + ': ' + UnicodeString(lpText));
  Result := 1;
end;

function CopyFile(lpExistingFileName, lpNewFileName: PWideChar; bFailIfExists: BOOL): BOOL;
var
  src, dst: TFileStream;
begin
  Result := False;
  if bFailIfExists and FileExists(lpNewFileName) then Exit;
  try
    src := TFileStream.Create(lpExistingFileName, fmOpenRead or fmShareDenyNone);
    try
      dst := TFileStream.Create(lpNewFileName, fmCreate);
      try
        dst.CopyFrom(src, 0);
      finally dst.Free; end;
    finally src.Free; end;
    Result := True;
  except
    on E: EStreamError do Result := False;
    on E: EInOutError do Result := False;
  end;
end;

end.
