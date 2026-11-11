// Modified 2026-11-11 by kxgcayh: macOS arm64 port (Free Pascal 3.2.2).
// Derived from XEditLib Original Code provided by Initial Developer matortheeternal.
// Changes are documented in macos/CHANGES.md; distributed under MPL 1.1.
unit xeTypes;

interface

uses
  wbInterface,
  Classes;

type
  TFastStringList = class(TStringList)
  protected
    {$IFDEF FPC}function DoCompareText(const S1, S2: AnsiString): PtrInt; override;{$ELSE}
    function CompareStrings(const S1, S2: String): Integer; override;{$ENDIF}
  public
    function IndexOfValue(const Value: String): Integer;
  end;

  TDynElements = array of IwbElement;

implementation

uses
  SysUtils;

{$region 'TFastStringList'}
{$IFDEF FPC}function TFastStringList.DoCompareText(const S1, S2: AnsiString): PtrInt;{$ELSE}
function TFastStringList.CompareStrings(const S1, S2: string): Integer;{$ENDIF}
begin
  Result := CompareStr(S1, S2);
end;

function TFastStringList.IndexOfValue(const Value: string): Integer;
var
  P: Integer;
  S: string;
begin
  for Result := 0 to GetCount - 1 do
  begin
    S := Get(Result);
    P := AnsiPos(NameValueSeparator, S);
    if (P <> 0) and (CompareStr(Copy(S, P + 1, Length(S)), Value) = 0) then Exit;
  end;
  Result := -1;
end;
{$endregion}

end.
