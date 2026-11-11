// Modified 2026-11-11 by kxgcayh: macOS arm64 port (Free Pascal 3.2.2).
// Derived from XEditLib Original Code provided by Initial Developer matortheeternal.
// Changes are documented in macos/CHANGES.md; distributed under MPL 1.1.
unit xeStackTrace;

interface

{$IFDEF FPC}
// JCL does not exist for FPC: report the raise-time frames of the exception being handled.
function CurrentExceptionStack: string;

implementation

function CurrentExceptionStack: string;
var
  i: Integer;
begin
  Result := '';
  if RaiseList = nil then Exit;
  Result := BackTraceStrFunc(RaiseList^.Addr);
  for i := 0 to RaiseList^.Framecount - 1 do
    Result := Result + #13#10 + BackTraceStrFunc(RaiseList^.Frames[i]);
end;

end.
{$ELSE}
uses
  SysUtils, Classes, JCLDebug;

implementation

function GetExceptionStackInfoProc(P: PExceptionRecord): Pointer;
var
  LLines: TStringList;
  LText: String;
  LResult: PChar;
begin
  LLines := TStringList.Create;
  try
    JclLastExceptStackListToStrings(LLines, True, True, True, True);
    LText := LLines.Text;
    LResult := StrAlloc(Length(LText));
    StrCopy(LResult, PChar(LText));
    Result := LResult;
  finally
    LLines.Free;
  end;
end;

function GetStackInfoStringProc(Info: Pointer): string;
begin
  Result := string(PChar(Info));
end;

procedure CleanUpStackInfoProc(Info: Pointer);
begin
  StrDispose(PChar(Info));
end;

initialization
  // Start the Jcl exception tracking and register our Exception
  // stack trace provider.
  if JclStartExceptionTracking then begin
    Exception.GetExceptionStackInfoProc := GetExceptionStackInfoProc;
    Exception.GetStackInfoStringProc := GetStackInfoStringProc;
    Exception.CleanUpStackInfoProc := CleanUpStackInfoProc;
  end;

finalization
  // Stop Jcl exception tracking and unregister our provider.
  if JclExceptionTrackingActive then begin
    Exception.GetExceptionStackInfoProc := nil;
    Exception.GetStackInfoStringProc := nil;
    Exception.CleanUpStackInfoProc := nil;
    JclStopExceptionTracking;
  end;

end.
{$ENDIF}
