{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_reclaim_units.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for container reset and child reference reclamation.

******************************************************************************}

program test_reclaim_units;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cthreads, cwstring,{$ENDIF}
  SysUtils, Classes,
  wbInterface, wbImplementation,
  xeMeta, xeSetup, xeFiles, xeElements, xeMessages;

procedure PrintMessages;
var
  len: Integer;
  s: WideString;
begin
  GetMessagesLength(@len);
  if len > 0 then begin
    SetLength(s, len);
    GetMessages(PWideChar(s), len);
    WriteLn('Messages: ', s);
  end;
end;

var
  pGamePath, pPlugins: WideString;
  status: Byte;
  fId, recId, childId: Cardinal;
  recIntf, childIntf: IInterface;
  container: IwbMainRecord;
  i: Integer;
begin
  WriteLn('Initializing XEdit...');
  InitXEdit;
  try
    pGamePath := ExpandFileName(ExtractFilePath(ParamStr(0)) + '../ref/fixtures') + '/';
    SetLanguage(PWideChar(WideString('English')));
    SetGamePath(PWideChar(pGamePath));
    SetGameMode(4); // GM_SSE

    pPlugins := 'Fixture.esm'#10'First.esp';
    LoadPlugins(PWideChar(pPlugins), False, False);

    while True do begin
      GetLoaderStatus(@status);
      if status = 2 then Break; // lsDone
      if status = 3 then begin // lsError
        WriteLn('Loader error:');
        PrintMessages;
        Halt(1);
      end;
      Sleep(10);
    end;

    WriteLn('Plugins loaded successfully.');

    // 1. Resolve First.esp
    if not FileByName(PWideChar(WideString('First.esp')), @fId) then begin
      WriteLn('FAIL: FileByName First.esp failed');
      Halt(1);
    end;
    WriteLn('First.esp handle: ', fId);

    // 2. Get the first record of First.esp
    recIntf := NativeFileByName('First.esp').Elements[0];
    recId := Store(recIntf);

    WriteLn('Record handle: ', recId);
    if not Supports(recIntf, IwbMainRecord, container) then begin
      WriteLn('FAIL: record is not IwbMainRecord');
      Halt(1);
    end;

    WriteLn('Container initial state:');
    WriteLn('  CanElementReset: ', container.CanElementReset);
    WriteLn('  csInit in ContainerStates: ', csInit in container.ContainerStates);

    Assert(container.CanElementReset, 'Initial CanElementReset must be True');

    // 3. Obtain a child element
    if not GetElement(recId, PWideChar(WideString('HEDR')), @childId) then begin
      WriteLn('FAIL: GetElement HEDR failed');
      Halt(1);
    end;
    WriteLn('Child HEDR handle: ', childId);

    // While child is held externally:
    WriteLn('State while child is held:');
    WriteLn('  CanElementReset: ', container.CanElementReset);
    WriteLn('  csInit in ContainerStates: ', csInit in container.ContainerStates);

    Assert(not container.CanElementReset, 'CanElementReset must be False while child is held');
    Assert(csInit in container.ContainerStates, 'csInit must be present while child is held');

    // 4. Release child element handle
    Release(childId);
    WriteLn('Child handle released.');

    WriteLn('State after child handle released:');
    WriteLn('  CanElementReset: ', container.CanElementReset);
    WriteLn('  csInit in ContainerStates: ', csInit in container.ContainerStates);

    if not container.CanElementReset then begin
      WriteLn('FAIL: cntElementRefs leaked! CanElementReset remains False!');
      Halt(1);
    end;

    if csInit in container.ContainerStates then begin
      WriteLn('FAIL: Container was not reset! csInit remains in ContainerStates!');
      Halt(1);
    end;

    WriteLn('OK: Single child acquire/release cleanly reset container and restored CanElementReset.');

    // 5. Test repeated load/walk/release cycles (100 cycles)
    WriteLn('Running 100 acquire/release cycles...');
    for i := 1 to 100 do begin
      if not GetElement(recId, PWideChar(WideString('HEDR')), @childId) then begin
        WriteLn('FAIL at cycle ', i, ': GetElement HEDR');
        Halt(1);
      end;
      Release(childId);

      if not container.CanElementReset then begin
        WriteLn('FAIL at cycle ', i, ': CanElementReset became False (references grew)');
        Halt(1);
      end;
      if csInit in container.ContainerStates then begin
        WriteLn('FAIL at cycle ', i, ': csInit present (failed to reset)');
        Halt(1);
      end;
    end;

    WriteLn('OK: 100 cycles completed cleanly, references did not grow!');

    Release(recId);
    Release(fId);
    WriteLn('ALL RECLAIM PASCAL UNIT TESTS PASSED');
  finally
    CloseXEdit;
  end;
end.
