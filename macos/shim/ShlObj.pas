{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is ShlObj.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Windows ShlObj folder resolution with stubs for macOS.

******************************************************************************}

unit ShlObj;
{ Shim for the Windows shell-folder unit. Folder lookups report not-found
  (empty path, result False). }
{$mode delphiunicode}
interface

const
  CSIDL_APPDATA        = $001A;
  CSIDL_PERSONAL       = $0005;
  CSIDL_LOCAL_APPDATA  = $001C;
  CSIDL_PROGRAM_FILES  = $0026;
  SHCNE_ASSOCCHANGED   = $08000000;
  SHCNF_IDLIST         = $0000;

function SHGetSpecialFolderPath(hwndOwner: NativeUInt; lpszPath: PWideChar;
  nFolder: Integer; fCreate: LongBool): LongBool;
procedure SHChangeNotify(wEventId: LongInt; uFlags: Cardinal; dwItem1, dwItem2: Pointer);

implementation

function SHGetSpecialFolderPath(hwndOwner: NativeUInt; lpszPath: PWideChar;
  nFolder: Integer; fCreate: LongBool): LongBool;
begin
  if lpszPath <> nil then
    lpszPath^ := #0; // callers SetLength() an uninitialised buffer and StrLen it
  Result := False;
end;

procedure SHChangeNotify(wEventId: LongInt; uFlags: Cardinal; dwItem1, dwItem2: Pointer);
begin
end;

end.
