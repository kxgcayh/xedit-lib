{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is AnsiStrings.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi System.AnsiStrings PAnsiChar helpers on Free Pascal.

******************************************************************************}

unit AnsiStrings;
{ Shim for Delphi's System.AnsiStrings on FPC (not shipped with FPC 3.2.2).
  PAnsiChar helpers only; the AnsiString overloads of UpperCase, CompareStr,
  Pos and friends already exist in FPC's SysUtils/System. }
{$mode delphiunicode}
interface

function StrLen(const P: PAnsiChar): SizeInt; overload; inline;
function StrPas(const P: PAnsiChar): AnsiString; overload; inline;
function StrPCopy(Dest: PAnsiChar; const Source: AnsiString): PAnsiChar; overload;
function StrCopy(Dest: PAnsiChar; const Source: PAnsiChar): PAnsiChar; overload; inline;
function StrComp(const S1, S2: PAnsiChar): Integer; overload; inline;
function StrIComp(const S1, S2: PAnsiChar): Integer; overload; inline;
function StrLComp(const S1, S2: PAnsiChar; MaxLen: SizeUInt): Integer; overload; inline;
function StrPos(const S1, S2: PAnsiChar): PAnsiChar; overload; inline;
function StrScan(const P: PAnsiChar; C: AnsiChar): PAnsiChar; overload; inline;
function StrEnd(const P: PAnsiChar): PAnsiChar; overload; inline;
function AnsiStrAlloc(Size: Cardinal): PAnsiChar; overload;

implementation

uses Strings;

function StrLen(const P: PAnsiChar): SizeInt; overload;
begin Result := Strings.StrLen(P); end;

function StrPas(const P: PAnsiChar): AnsiString; overload;
begin Result := Strings.StrPas(P); end;

function StrPCopy(Dest: PAnsiChar; const Source: AnsiString): PAnsiChar; overload;
begin Result := Strings.StrPCopy(Dest, Source); end;

function StrCopy(Dest: PAnsiChar; const Source: PAnsiChar): PAnsiChar; overload;
begin Result := Strings.StrCopy(Dest, Source); end;

function StrComp(const S1, S2: PAnsiChar): Integer; overload;
begin Result := Strings.StrComp(S1, S2); end;

function StrIComp(const S1, S2: PAnsiChar): Integer; overload;
begin Result := Strings.StrIComp(S1, S2); end;

function StrLComp(const S1, S2: PAnsiChar; MaxLen: SizeUInt): Integer; overload;
begin Result := Strings.StrLComp(S1, S2, MaxLen); end;

function StrPos(const S1, S2: PAnsiChar): PAnsiChar; overload;
begin Result := Strings.StrPos(S1, S2); end;

function StrScan(const P: PAnsiChar; C: AnsiChar): PAnsiChar; overload;
begin Result := Strings.StrScan(P, C); end;

function StrEnd(const P: PAnsiChar): PAnsiChar; overload;
begin Result := Strings.StrEnd(P); end;

function AnsiStrAlloc(Size: Cardinal): PAnsiChar; overload;
begin
  Result := Strings.StrAlloc(Size);
end;

end.
