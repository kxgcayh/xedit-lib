{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is Registry.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Windows Registry access with non-functional stubs for macOS.

******************************************************************************}

unit Registry;
{ Shim for the Windows registry unit. There is no registry here: every key
  lookup reports not-found, so callers fall back to their "path not set"
  branch. Writes fail loudly. }
{$mode delphiunicode}
interface

uses SysUtils, Classes;

type
  HKEY = NativeUInt;
  ERegistryException = class(Exception);

const
  HKEY_CLASSES_ROOT     = HKEY($80000000);
  HKEY_CURRENT_USER     = HKEY($80000001);
  HKEY_LOCAL_MACHINE    = HKEY($80000002);
  HKEY_USERS            = HKEY($80000003);
  HKEY_CURRENT_CONFIG   = HKEY($80000005);
  KEY_READ              = $20019;
  KEY_ALL_ACCESS        = $F003F;
  KEY_WOW64_32KEY       = $0200;
  KEY_WOW64_64KEY       = $0100;

type
  TRegistry = class
  private
    FRootKey: HKEY;
  public
    constructor Create; overload;
    constructor Create(AAccess: LongWord); overload;
    property RootKey: HKEY read FRootKey write FRootKey;
    function OpenKey(const Key: string; CanCreate: Boolean): Boolean;
    function OpenKeyReadOnly(const Key: string): Boolean;
    function KeyExists(const Key: string): Boolean;
    function ValueExists(const Name: string): Boolean;
    function ReadString(const Name: string): string;
    procedure WriteString(const Name, Value: string);
    procedure CloseKey;
  end;

implementation

constructor TRegistry.Create;
begin
  inherited Create;
  FRootKey := HKEY_CURRENT_USER;
end;

constructor TRegistry.Create(AAccess: LongWord);
begin
  Create;
end;

function TRegistry.OpenKey(const Key: string; CanCreate: Boolean): Boolean;
begin
  Result := False;
end;

function TRegistry.OpenKeyReadOnly(const Key: string): Boolean;
begin
  Result := False;
end;

function TRegistry.KeyExists(const Key: string): Boolean;
begin
  Result := False;
end;

function TRegistry.ValueExists(const Name: string): Boolean;
begin
  Result := False;
end;

function TRegistry.ReadString(const Name: string): string;
begin
  raise ERegistryException.CreateFmt('Failed to read "%s": no registry on this platform', [Name]);
end;

procedure TRegistry.WriteString(const Name, Value: string);
begin
  raise ERegistryException.CreateFmt('Failed to write "%s": no registry on this platform', [Name]);
end;

procedure TRegistry.CloseKey;
begin
end;

end.
