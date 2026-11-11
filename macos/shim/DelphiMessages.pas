{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is DelphiMessages.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Free Pascal default RTL exception text formatting with Delphi exception messages.

******************************************************************************}

unit DelphiMessages;
{ FPC only: replaces FPC's RTL exception texts with the Delphi ones, because the
  stage 3 reference (Windows XEditLib.dll) reports the Delphi texts to callers. }

interface

implementation

uses
  SysUtils;

// Delphi form: 'Assertion failure (<build path>, line N)'. The build path and line numbers are
// those of the shipped DLL (a different source revision), so only Imaging.pas matches; the
// one wbImplementation.pas assert seen in stage 3 is special-cased at its site.
procedure DelphiAssert(const Msg, FileName: ShortString; LineNo: LongInt; ErrorAddr: Pointer);
var
  dir, text: string;
  line: LongInt;
begin
  dir := 'lib\xedit\';
  line := LineNo;
  if SameText(ExtractFileName(FileName), 'Imaging.pas') then
    dir := 'lib\Imaging\';
  text := Msg;
  if (text = '') or (text = 'Assertion failed') then text := 'Assertion failure';
  raise EAssertionFailed.Create(Format('%s (E:\dev\git\xedit-lib\%s%s, line %d)',
    [text, dir, ExtractFileName(FileName), line])) at ErrorAddr;
end;

function MapText(Name, Value: AnsiString; Hash: LongInt; arg: Pointer): AnsiString;
begin
  Result := Value;
  if (Name = 'sysconst.slistindexerror') or (Name = 'rtlconsts.slistindexerror') then Result := 'List index out of bounds (%d)'
  else if Name = 'sysconst.sinvalidinteger' then Result := '''%s'' is not a valid integer value'
  else if Name = 'sysconst.sinvalidfloat' then Result := '''%s'' is not a valid floating point value';
end;

initialization
  AssertErrorProc := @DelphiAssert;
  SetResourceStrings(@MapText, nil);
end.
