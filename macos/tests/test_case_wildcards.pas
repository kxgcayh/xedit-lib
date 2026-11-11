{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_case_wildcards.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for case-insensitive file matching and string table loading.

******************************************************************************}

program test_case_wildcards;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, wbLocalization, wbHelpers, wbInterface, wbBSA;
var
  dir, sDir: string;
  langs, lfiles: TStringList;
  bsaNames, bsaMissing: TStringList;
  cnt: Integer;
begin
  dir := IncludeTrailingPathDelimiter(GetTempDir(True)) + 'xe_case_test';
  sDir := dir + 'Strings';
  ForceDirectories(sDir);

  // 1. Test lowercase .strings, .dlstrings, .ilstrings
  with TStringList.Create do
  try
    Add('dummy');
    SaveToFile(sDir + '/MyMod_English.strings');
    SaveToFile(sDir + '/MyMod_English.dlstrings');
    SaveToFile(sDir + '/MyMod_French.ilstrings');
    SaveToFile(sDir + '/UPPER_GERMAN.STRINGS');
    SaveToFile(sDir + '/not_a_string.txt');
  finally
    Free;
  end;

  wbDataPath := IncludeTrailingPathDelimiter(dir);
  langs := wbLocalizationHandler.AvailableLanguages;
  try
    Assert(langs.IndexOf('English') >= 0, 'Expected English from lowercase .strings/.dlstrings');
    Assert(langs.IndexOf('French') >= 0, 'Expected French from lowercase .ilstrings');
    Assert(langs.IndexOf('German') >= 0, 'Expected German from uppercase .STRINGS');
    Assert(langs.Count = 3, 'Expected 3 languages');
  finally
    langs.Free;
  end;

  lfiles := wbLocalizationHandler.AvailableLocalizationFiles;
  try
    Assert(lfiles.Count = 4, 'Expected 4 localization files, got ' + IntToStr(lfiles.Count));
    Assert(lfiles.IndexOf('MyMod_English.strings') >= 0);
    Assert(lfiles.IndexOf('MyMod_English.dlstrings') >= 0);
    Assert(lfiles.IndexOf('MyMod_French.ilstrings') >= 0);
    Assert(lfiles.IndexOf('UPPER_GERMAN.STRINGS') >= 0);
  finally
    lfiles.Free;
  end;

  // 2. Test HasBSAs case sensitivity
  wbContainerHandler := wbCreateContainerHandler;
  try
    with TStringList.Create do
    try
      Add('dummy bsa');
      SaveToFile(dir + 'TestArchive.BSA'); // Uppercase .BSA
      SaveToFile(dir + 'PartialMatch - Textures.BSA');
    finally
      Free;
    end;

    wbArchiveExtension := '.bsa'; // lowercase search extension
    bsaNames := TStringList.Create;
    bsaMissing := TStringList.Create;
    try
      // exact = True: TestArchive + .bsa must match TestArchive.BSA
      cnt := HasBSAs('TestArchive', wbDataPath, True, False, bsaNames, bsaMissing);
      Assert(cnt = 1, 'Expected 1 exact BSA match, got ' + IntToStr(cnt));
      Assert(bsaNames.IndexOf('TestArchive.BSA') >= 0);

      // exact = False: PartialMatch* + .bsa must match PartialMatch - Textures.BSA
      bsaNames.Clear;
      cnt := HasBSAs('PartialMatch', wbDataPath, False, False, bsaNames, bsaMissing);
      Assert(cnt = 1, 'Expected 1 partial BSA match, got ' + IntToStr(cnt));
      Assert(bsaNames.IndexOf('PartialMatch - Textures.BSA') >= 0);
    finally
      bsaNames.Free;
      bsaMissing.Free;
    end;
  finally
    wbContainerHandler := nil;
  end;

  // Cleanup
  DeleteFile(sDir + '/MyMod_English.strings');
  DeleteFile(sDir + '/MyMod_English.dlstrings');
  DeleteFile(sDir + '/MyMod_French.ilstrings');
  DeleteFile(sDir + '/UPPER_GERMAN.STRINGS');
  DeleteFile(sDir + '/not_a_string.txt');
  RemoveDir(sDir);
  DeleteFile(dir + 'TestArchive.BSA');
  DeleteFile(dir + 'PartialMatch - Textures.BSA');
  RemoveDir(dir);

  WriteLn('wildcard case tests OK');
end.
