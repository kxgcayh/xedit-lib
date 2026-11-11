{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is Vcl.Graphics.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi Vcl.Graphics color constants and TColor type.

******************************************************************************}

unit Vcl.Graphics;
{$mode delphi}
interface
type TColor = -$7FFFFFFF-1..$7FFFFFFF;
const
  clBlack=TColor($000000); clMaroon=TColor($000080); clGreen=TColor($008000); clOlive=TColor($008080);
  clNavy=TColor($800000); clPurple=TColor($800080); clTeal=TColor($808000); clGray=TColor($808080);
  clSilver=TColor($C0C0C0); clRed=TColor($0000FF); clLime=TColor($00FF00); clYellow=TColor($00FFFF);
  clBlue=TColor($FF0000); clFuchsia=TColor($FF00FF); clAqua=TColor($FFFF00); clWhite=TColor($FFFFFF);
  clLtGray=TColor($C0C0C0); clDkGray=TColor($808080); clMedGray=TColor($A4A0A0);
  clWindowText=TColor($FF000008); clWindow=TColor($FF000005); clDefault=TColor($20000000); clNone=TColor($1FFFFFFF);
implementation
end.
