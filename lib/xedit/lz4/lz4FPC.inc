{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is lz4FPC.inc.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Target architecture define mappings (WIN32/WIN64) for Free Pascal.

******************************************************************************}

{ FPC port: these units select 32/64-bit code paths with WIN32/WIN64. Map them
  from the target pointer size so the same paths compile on non-Windows. }
{$IFDEF FPC}
  {$IFDEF CPU64}
    {$DEFINE WIN64}
  {$ELSE}
    {$DEFINE WIN32}
  {$ENDIF}
{$ENDIF}
