{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_argo.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for JSON parsing and serialization using Argo.

******************************************************************************}

program test_argo;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, Argo, ArgoTypes;
var
  o, o2: TJSONObject;
  a: TJSONArray;
  s: string;
  raised: Boolean;
  t: TArgoTree;
begin
  o := TJSONObject.Create('{"name":"Skyrim","n":42,"f":1.5,"ok":true,"nil":null,"arr":[1,"two",false],"sub":{"x":"é\"q"}}');
  try
    Assert(o.S['name'] = 'Skyrim');
    Assert(o.I['n'] = 42);
    Assert(Abs(o.D['f'] - 1.5) < 1e-9);
    Assert(o.B['ok']);
    Assert(o.HasKey('nil') and o.Values['nil'].IsNull);
    Assert(o.A['arr'].Count = 3);
    Assert(o.A['arr'].I[0] = 1);
    Assert(o.A['arr'].S[1] = 'two');
    Assert(not o.A['arr'].B[2]);
    Assert(o.O['sub'].S['x'] = WideChar($E9) + '"q');
    // round-trip: serialize, reparse, compare
    s := o.ToString;
    o2 := TJSONObject.Create(s);
    try
      Assert(o2.S['name'] = 'Skyrim');
      Assert(o2.O['sub'].S['x'] = WideChar($E9) + '"q');
      Assert(o2.ToString = s);
    finally o2.Free; end;
  finally
    o.Free;
  end;

  // building
  o := TJSONObject.Create;
  a := TJSONArray.Create;
  a.Add(1); a.Add('x');
  o.A['list'] := a;
  o.S['k'] := 'v';
  s := o.ToString;
  Assert(Pos('"list"', s) > 0);
  o.Free;

  // malformed input raises JSONException
  raised := False;
  try TJSONObject.Create('{"a":').Free; except on JSONException do raised := True; end;
  Assert(raised);

  // case-sensitive key list (ArgoTypes.TFastStringList)
  with TFastStringList.Create do begin
    CaseSensitive := False; Sorted := True; Duplicates := dupIgnore;
    Add('a'); Add('A');
    Assert(Count = 2);
    Free;
  end;
  WriteLn('argo OK');
end.
