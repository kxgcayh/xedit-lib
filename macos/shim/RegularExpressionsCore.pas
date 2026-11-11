{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is RegularExpressionsCore.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi RegularExpressionsCore (PCRE) with a Free Pascal RegExpr wrapper.

******************************************************************************}

unit RegularExpressionsCore;
{ Shim for the Delphi PCRE wrapper RegularExpressionsCore on FPC, backed by
  RegExpr. Only TPerlRegEx.Subject / RegEx / Options / MatchAgain, as used by
  wbHelpers.IsFileCC. }
{$mode delphiunicode}
interface

uses SysUtils, RegExpr;

type
  TPerlRegExOption = (preCaseLess, preMultiLine, preSingleLine, preExtended);
  TPerlRegExOptions = set of TPerlRegExOption;

  TPerlRegEx = class
  public
    Subject: string;
    RegEx: string;
    Options: TPerlRegExOptions;
    function MatchAgain: Boolean;
  end;

implementation

function TPerlRegEx.MatchAgain: Boolean;
var
  r: TRegExpr;
begin
  r := TRegExpr.Create(RegEx);
  try
    r.ModifierI := preCaseLess in Options;
    r.ModifierM := preMultiLine in Options;
    r.ModifierS := preSingleLine in Options;
    r.ModifierX := preExtended in Options;
    Result := r.Exec(Subject);
  finally
    r.Free;
  end;
end;

end.
