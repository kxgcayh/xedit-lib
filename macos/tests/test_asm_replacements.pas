{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_asm_replacements.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for Pascal replacements of x86 assembly routines.

******************************************************************************}

program test_asm_replacements;
{$mode delphiunicode}
uses cwstring, SysUtils, wbInterface, wbImplementation;
type
  TEntry = record formID: Cardinal; rec: Pointer; end; // same layout as TwbRecordSortEntry
var a, b: TEntry; n: Integer;
begin
  Assert(CmpB8(1,2) = -1); Assert(CmpB8(200,100) = 1); Assert(CmpB8(5,5) = 0);
  Assert(CmpI32(-5,3) = -1); Assert(CmpI32(3,-5) = 1); Assert(CmpI32(Low(Integer),High(Integer)) = -1);
  Assert(CmpW32($FFFFFFFF,1) = 1); Assert(CmpW32(1,$FFFFFFFF) = -1); Assert(CmpW32(7,7) = 0);
  Assert(CmpI64(Low(Int64),High(Int64)) = -1); Assert(CmpI64(High(Int64),0) = 1); Assert(CmpI64(-3,-3) = 0);
  Assert(CompareFormIDs(Pointer(PtrUInt($80000000)), Pointer(PtrUInt(1))) = 1); // unsigned
  Assert(CompareFormIDs(Pointer(PtrUInt(1)), Pointer(PtrUInt($80000000))) = -1);
  Assert(CompareFormIDs(Pointer(PtrUInt(9)), Pointer(PtrUInt(9))) = 0);
  a.formID := $FF000001; a.rec := Pointer(1); b.formID := 2; b.rec := Pointer(99);
  Assert(CompareSortEntryPtrs(@a, @b) = 1); Assert(CompareSortEntryPtrs(@b, @a) = -1);
  b.formID := a.formID; Assert(CompareSortEntryPtrs(@a, @b) = 0); // differing padding/rec must not matter
  n := 0; Assert(LockedInc(n) = 1); Assert(LockedInc(n) = 2); Assert(LockedDec(n) = 1); Assert(LockedDec(n) = 0); Assert(LockedDec(n) = -1);
  WriteLn('asm replacements OK');
end.
