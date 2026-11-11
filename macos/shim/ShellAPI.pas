{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is ShellAPI.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Windows ShellAPI file operations and constants for POSIX.

******************************************************************************}

unit ShellAPI;
{ Shim for the Windows ShellAPI unit: file-operation records and constants.
  SHFileOperation raises: nothing here may silently pretend to delete files. }
{$mode delphiunicode}
interface

uses SysUtils;

const
  FO_MOVE   = $0001;
  FO_COPY   = $0002;
  FO_DELETE = $0003;
  FO_RENAME = $0004;
  FOF_MULTIDESTFILES  = $0001;
  FOF_SILENT          = $0004;
  FOF_NOCONFIRMATION  = $0010;
  FOF_ALLOWUNDO       = $0040;
  FOF_NOCONFIRMMKDIR  = $0200;
  FOF_NOERRORUI       = $0400;
  FOF_NO_UI           = FOF_SILENT or FOF_NOCONFIRMATION or FOF_NOERRORUI or FOF_NOCONFIRMMKDIR;

type
  TSHFileOpStruct = record
    Wnd: NativeUInt;
    wFunc: Cardinal;
    pFrom: PWideChar;
    pTo: PWideChar;
    fFlags: Word;
    fAnyOperationsAborted: LongBool;
    hNameMappings: Pointer;
    lpszProgressTitle: PWideChar;
  end;
  SHFILEOPSTRUCT = TSHFileOpStruct;

function SHFileOperation(var lpFileOp: TSHFileOpStruct): Integer;

implementation

function SHFileOperation(var lpFileOp: TSHFileOpStruct): Integer;
begin
  raise Exception.Create('SHFileOperation is not available on this platform');
end;

end.
