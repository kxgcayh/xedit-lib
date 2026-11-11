{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is test_imaging.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Unit tests for Vampyre Imaging image format loading.

******************************************************************************}

program test_imaging;
{$mode delphiunicode}
uses
  {$IFDEF UNIX}cwstring,{$ENDIF}
  SysUtils, Classes, ImagingTypes, Imaging, ImagingDds, ImagingNetworkGraphics,
  ImagingTarga, ImagingBitmap, ImagingClasses, ImagingCanvases, ImagingFormats, ImagingUtility;
var
  img, img2: TImageData;
  ms: TMemoryStream;
  px: PByte;
  i: Integer;
  c: TColor32Rec;
begin
  Assert(NewImage(4, 4, ifA8R8G8B8, img));
  px := img.Bits;
  for i := 0 to 15 do begin  // B,G,R,A per pixel
    px[i*4+0] := i * 10; px[i*4+1] := 255 - i; px[i*4+2] := i * 3; px[i*4+3] := 255;
  end;
  // lossless round trips through each registered format
  for i := 0 to 2 do begin
    ms := TMemoryStream.Create;
    try
      case i of
        0: Assert(SaveImageToStream('dds', ms, img));
        1: Assert(SaveImageToStream('png', ms, img));
        2: Assert(SaveImageToStream('tga', ms, img));
      end;
      Assert(ms.Size > 16);
      ms.Position := 0;
      InitImage(img2);
      Assert(LoadImageFromStream(ms, img2));
      Assert((img2.Width = 4) and (img2.Height = 4));
      ConvertImage(img2, ifA8R8G8B8);
      Assert(CompareMem(img2.Bits, img.Bits, 64));
      FreeImage(img2);
    finally ms.Free; end;
  end;
  // DXT1 compress then decompress: size and rough colour
  Assert(CloneImage(img, img2));
  Assert(ConvertImage(img2, ifDXT1));
  Assert(img2.Size = 8);
  Assert(ConvertImage(img2, ifA8R8G8B8));
  c := GetPixel32(img2, 0, 0);
  Assert(c.A = 255);
  FreeImage(img2);
  // a stray-byte-swap sanity check on helpers from ImagingUtility
  Assert(SwapEndianWord($1234) = $3412);
  Assert(SwapEndianLongWord($11223344) = $44332211);
  FreeImage(img);
  WriteLn('imaging OK');
end.
