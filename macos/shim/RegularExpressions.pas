{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is RegularExpressions.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi System.RegularExpressions with a Free Pascal RegExpr wrapper.

******************************************************************************}

unit RegularExpressions;
{ Shim for Delphi's System.RegularExpressions on FPC, backed by FPC's RegExpr.
  Covers TRegEx.Create / Match, TMatch.Success / Groups.Item[i].Value as used
  by xeErrors. TRegExpr is Perl-like but not PCRE: no look-behind. }
{$mode delphiunicode}
interface

uses SysUtils, RegExpr;

type
  TGroup = record
    Value: string;
    Success: Boolean;
  end;

  TGroupCollection = record
  private
    FItems: array of TGroup;
    function GetItem(Index: Integer): TGroup;
  public
    function Count: Integer;
    property Item[Index: Integer]: TGroup read GetItem; default;
  end;

  TMatch = record
    Success: Boolean;
    Value: string;
    Groups: TGroupCollection;
  end;

  TRegEx = record
  private
    FPattern: string;
  public
    constructor Create(const Pattern: string);
    function Match(const Input: string): TMatch;
    function IsMatch(const Input: string): Boolean;
  end;

implementation

function TGroupCollection.GetItem(Index: Integer): TGroup;
begin
  if (Index < 0) or (Index > High(FItems)) then
    raise ERegExpr.CreateFmt('Group index %d out of range', [Index]);
  Result := FItems[Index];
end;

function TGroupCollection.Count: Integer;
begin
  Result := Length(FItems);
end;

constructor TRegEx.Create(const Pattern: string);
begin
  FPattern := Pattern;
end;

function TRegEx.Match(const Input: string): TMatch;
var
  r: TRegExpr;
  i: Integer;
begin
  Result.Success := False;
  Result.Value := '';
  Result.Groups.FItems := nil;
  r := TRegExpr.Create(FPattern);
  try
    r.ModifierS := False; // PCRE default: '.' does not match a line break
    if r.Exec(Input) then begin
      Result.Success := True;
      Result.Value := r.Match[0];
      SetLength(Result.Groups.FItems, r.SubExprMatchCount + 1);
      for i := 0 to r.SubExprMatchCount do begin
        Result.Groups.FItems[i].Value := r.Match[i];
        Result.Groups.FItems[i].Success := r.MatchPos[i] > 0;
      end;
    end;
  finally
    r.Free;
  end;
end;

function TRegEx.IsMatch(const Input: string): Boolean;
begin
  Result := Match(Input).Success;
end;

end.
