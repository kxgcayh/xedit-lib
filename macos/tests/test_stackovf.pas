{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_stackovf.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for native stack overflow signal handling and thread recovery.

******************************************************************************}

program test_stackovf;
{$mode delphiunicode}
uses
  cthreads, SysUtils, Classes, BaseUnix, UnixType, NativeFaults;

type
  TRecurseThread = class(TThread)
  private
    FDepth: Integer;
    FSuccess: Boolean;
    FErrMsg: string;
    procedure DoRecurse(N: Integer);
  protected
    procedure Execute; override;
  public
    constructor Create;
    property Success: Boolean read FSuccess;
    property ErrMsg: string read FErrMsg;
  end;

procedure DeepRecurseMain(N: Integer);
var
  Buffer: array[0..1023] of Byte;
begin
  Buffer[0] := N;
  DeepRecurseMain(N + 1);
end;

procedure TRecurseThread.DoRecurse(N: Integer);
var
  Buffer: array[0..1023] of Byte;
begin
  Buffer[0] := N;
  DoRecurse(N + 1);
end;

constructor TRecurseThread.Create;
begin
  inherited Create(True);
  FSuccess := False;
  FErrMsg := '';
end;

procedure TRecurseThread.Execute;
var
  ThreadAltStack: TThreadAltStackRecord;
  Run: Integer;
begin
  InstallThreadAltStack(ThreadAltStack);
  try
    try
      for Run := 1 to 2 do begin
        try
          DoRecurse(1);
          FSuccess := False;
          FErrMsg := 'Did not raise exception on run ' + IntToStr(Run);
          Exit;
        except
          on E: EStackOverflow do begin
            if E.Message <> 'Stack overflow' then begin
              FSuccess := False;
              FErrMsg := 'Wrong message on run ' + IntToStr(Run) + ': ' + E.Message;
              Exit;
            end;
          end;
          on E: Exception do begin
            FSuccess := False;
            FErrMsg := 'Unexpected exception ' + E.ClassName + ' on run ' + IntToStr(Run) + ': ' + E.Message;
            Exit;
          end;
        end;
      end;
      FSuccess := True;
    except
      on E: Exception do begin
        FSuccess := False;
        FErrMsg := 'Unhandled exception: ' + E.Message;
      end;
    end;
  finally
    RemoveThreadAltStack(ThreadAltStack);
  end;
end;

var
  Run: Integer;
  ThreadTest: TRecurseThread;
begin
  WriteLn('=== Pascal Host Stack Overflow Test ===');

  // Test 1: Main thread deep recursion (run twice in one process)
  WriteLn('Testing main thread deep recursion (2 runs)...');
  for Run := 1 to 2 do begin
    try
      DeepRecurseMain(1);
      WriteLn('FAIL: main thread run ', Run, ' did not raise');
      Halt(1);
    except
      on E: EStackOverflow do begin
        if E.Message <> 'Stack overflow' then begin
          WriteLn('FAIL: main thread run ', Run, ' wrong error message: ', E.Message);
          Halt(2);
        end;
        WriteLn('  Main thread run ', Run, ' caught: [', E.ClassName, '] ', E.Message);
      end;
      on E: Exception do begin
        WriteLn('FAIL: main thread run ', Run, ' caught unexpected ', E.ClassName, ': ', E.Message);
        Halt(3);
      end;
    end;
  end;
  WriteLn('PASS: main thread stack overflow caught cleanly twice');

  // Test 2: Library-created thread deep recursion (run twice in one process)
  WriteLn('Testing library-created thread deep recursion...');
  ThreadTest := TRecurseThread.Create;
  ThreadTest.Start;
  ThreadTest.WaitFor;
  if not ThreadTest.Success then begin
    WriteLn('FAIL: thread recursion failed: ', ThreadTest.ErrMsg);
    ThreadTest.Free;
    Halt(4);
  end;
  ThreadTest.Free;
  WriteLn('PASS: library-created thread stack overflow caught cleanly twice');

  WriteLn('ALL PASCAL HOST TESTS PASSED!');
end.
