{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_shims.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for Windows and Delphi compatibility shims.

******************************************************************************}

program test_shims;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring, BaseUnix,{$ENDIF}
  SysUtils, Classes, Types, Generics.Collections, WideStrUtils,
  AnsiStrings, IOUtils, Registry, ShlObj, ShellAPI, RegularExpressions, RegularExpressionsCore;
var
  s, dir, f1, f2: string;
  r: TRegistry;
  fs: TStringDynArray;
  m: TMatch;
  buf: UnicodeString;
  sl: TList<Integer>;
  d: TDictionary<string,Integer>;
  fo: TSHFileOpStruct;
  raised: Boolean;
  p: TPerlRegEx;
  a: AnsiString;
begin
  // Registry: everything not found
  r := TRegistry.Create;
  r.RootKey := HKEY_LOCAL_MACHINE;
  Assert(not r.OpenKeyReadOnly('\SOFTWARE\Bethesda Softworks\Skyrim\'));
  Assert(not r.OpenKey('\Software\Classes\.esp', False));
  raised := False;
  try r.WriteString('', 'x'); except on ERegistryException do raised := True; end;
  Assert(raised);
  r.Free;

  // ShlObj: not found, buffer terminated
  SetLength(buf, 260); FillChar(buf[1], 520, 65);
  Assert(not SHGetSpecialFolderPath(0, PChar(buf), CSIDL_PERSONAL, True));
  SetLength(buf, StrLen(PChar(buf)));
  Assert(buf = '');

  // ShellAPI: no silent delete
  FillChar(fo, SizeOf(fo), 0); fo.wFunc := FO_DELETE;
  raised := False;
  try SHFileOperation(fo); except on Exception do raised := True; end;
  Assert(raised);

  // IOUtils
  Assert(TPath.HasExtension('a/b.esp') and not TPath.HasExtension('a.b/c'));
  Assert(not TPath.HasExtension('foo.') and not TPath.HasExtension('.'));
  Assert(TPath.HasValidFileNameChars('Skyrim.esm', False));
  Assert(not TPath.HasValidFileNameChars('a:b', False));
  Assert(not TPath.HasValidFileNameChars('a*b', False) and TPath.HasValidFileNameChars('a*b', True));
  Assert(TPath.GetTempPath <> '');
  dir := IncludeTrailingPathDelimiter(GetTempDir(True)) + 'libs_shim_test';
  ForceDirectories(dir + '/sub');
  {$IFDEF UNIX}
  BaseUnix.FpSymlink(PAnsiChar(RawByteString(dir)), PAnsiChar(RawByteString(dir + '/sub/loop_link')));
  {$ENDIF}
  f1 := dir + '/one.txt'; f2 := dir + '/sub/two.txt';
  with TStringList.Create do begin Add('alpha'); Add('beta'); SaveToFile(f1); Free; end;
  TFile.Copy(f1, f2, True);
  raised := False;
  try TFile.Copy(f1, f2, False); except on EInOutError do raised := True; end;
  Assert(raised);
  Assert(TDirectory.Exists(dir) and not TDirectory.Exists(dir + '/nope'));
  fs := TDirectory.GetFiles(dir, '*.*', TSearchOption.soAllDirectories);
  Assert(Length(fs) = 2);
  fs := TDirectory.GetFiles(dir, '*.*', TSearchOption.soTopDirectoryOnly);
  Assert((Length(fs) = 1) and (fs[0] = f1));
  fs := TFile.ReadAllLines(f2);
  Assert((Length(fs) = 2) and (fs[1] = 'beta'));
  {$IFDEF UNIX}
  BaseUnix.FpUnlink(PAnsiChar(RawByteString(dir + '/sub/loop_link')));
  {$ENDIF}
  DeleteFile(f2); DeleteFile(f1); RemoveDir(dir + '/sub'); RemoveDir(dir);

  // RegularExpressions (xeErrors patterns)
  m := TRegEx.Create('Found a ([a-zA-Z_]+) reference, expected: (.+)').Match('Found a REFR reference, expected: NPC_');
  Assert(m.Success and (m.Groups.Item[1].Value = 'REFR') and (m.Groups.Item[2].Value = 'NPC_'));
  m := TRegEx.Create('\[([0-9A-F]+)\] \< Error: Could not be resolved \>').Match('[0012AB] < Error: Could not be resolved >');
  Assert(m.Success and (m.Groups.Item[1].Value = '0012AB'));
  Assert(not TRegEx.Create('Record marked as deleted but contains: (.+)').Match('nothing').Success);
  m := TRegEx.Create('Error: Record contains unexpected \(or out of order\) subrecord (.+)').Match('Error: Record contains unexpected (or out of order) subrecord XYZ');
  Assert(m.Success and (m.Groups.Item[1].Value = 'XYZ'));

  // RegularExpressionsCore (IsFileCC)
  p := TPerlRegEx.Create;
  p.RegEx := 'cc([a-z]{3})(sse|fo4)(\d{3})\-(\S+)\.(esp|esm|esl)';
  p.Options := [preCaseLess, preSingleLine];
  p.Subject := 'ccBGSSSE001-Fish.esm'; Assert(p.MatchAgain);
  p.Subject := 'Update.esm'; Assert(not p.MatchAgain);
  p.Free;

  // Generics.Collections and WideStrUtils exist in FPC as-is
  sl := TList<Integer>.Create; sl.Add(3); Assert(sl.Count = 1); sl.Free;
  d := TDictionary<string,Integer>.Create; d.Add('a', 1); Assert(d['a'] = 1); d.Free;
  Assert(UTF8Encode('a') = 'a');

  // AnsiStrings
  a := 'hello';
  Assert(StrLen(PAnsiChar(a)) = 5);
  Assert(StrPas(PAnsiChar(a)) = 'hello');
  WriteLn('shims OK');
end.
