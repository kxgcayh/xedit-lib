{******************************************************************************

     The contents of this file are subject to the Mozilla Public License
     Version 1.1 (the "License"); you may not use this file except in
     compliance with the License. You may obtain a copy of the License at
     http://www.mozilla.org/MPL/

     Software distributed under the License is distributed on an "AS IS"
     basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
     License for the specific language governing rights and limitations
     under the License.

     The Original Code is NativeFaults.pas.

     The Initial Developer of the Original Code is kxgcayh.
     Portions created by kxgcayh are Copyright (C) 2026 kxgcayh.
     All Rights Reserved.

     Replaces Delphi Windows structured exception handling with Darwin POSIX signal handlers and stack overflow recovery.

******************************************************************************}

unit NativeFaults;
{ FPC library startup does not hook hardware signals. Keep host faults in the
  host and use an RTL context trampoline for faults in this Mach-O image.

  Bounded contract notes:
  - Host chaining: honours SA_SIGINFO vs 1-arg calling convention, SA_RESETHAND
    (reset to SIG_DFL), sa_mask (temporarily masked during host handler execution),
    and SA_NODEFER (unmasked during execution if requested by saved action).
  - Stack overflow: signal action installed with SA_ONSTACK. Main
    thread installs a process-lifetime alternate stack (96 KB signal stack + 32 KB
    emergency region) if SS_DISABLE at library initialization. Library-created
    threads install per-thread alternate stacks via InstallThreadAltStack and
    RemoveThreadAltStack. Stack overflow faults near the stack bottom / guard page
    are detected and redirected via emergency SP to StackOverflowTrampoline raising
    EStackOverflow ('Stack overflow'), unwinding via SJLJ. Foreign external threads
    entering without an alternate stack are not lazily hooked to avoid per-API-entry
    overhead; stack faults on unhooked foreign threads terminate at the kernel.
  - Unload lifecycle: Darwin FPC dylib finalization under dlclose may not execute
    if dyld retains the image; Node.js does not dlclose this library in practice. }
{$mode delphiunicode}
interface

{$IFDEF FPC}
{$IFDEF DARWIN}
{$IFDEF CPUAARCH64}
uses
  BaseUnix, UnixType;

type
  TSigAltStack = record
    ss_sp: Pointer;
    ss_size: csize_t;
    ss_flags: cint;
  end;
  PSigAltStack = ^TSigAltStack;

  TThreadAltStackRecord = record
    AllocBase: Pointer;
    AllocSize: PtrUInt;
    OldStack: TSigAltStack;
    Installed: Boolean;
  end;

function sigaltstack(ss, oss: PSigAltStack): cint; cdecl; external 'c';

procedure InstallThreadAltStack(var Rec: TThreadAltStackRecord);
procedure RemoveThreadAltStack(var Rec: TThreadAltStackRecord);
{$ENDIF}
{$ENDIF}
{$ENDIF}

implementation
{$IFDEF FPC}
{$IFDEF DARWIN}
{$IFDEF CPUAARCH64}
uses SysUtils;

type
  TDlInfo = record
    FileName, ImageBase, SymbolName, SymbolAddress: Pointer;
  end;
  TMachHeader = packed record
    Magic, CpuType, CpuSubtype, FileType, CommandCount, CommandSize,
      Flags, Reserved: LongWord;
  end;
  PMachHeader = ^TMachHeader;
  TSegment = packed record
    Command, Size: LongWord;
    Name: array[0..15] of AnsiChar;
    Address, VirtualSize, FileOffset, FileSize: QWord;
    MaxProtection, Protection, SectionCount, Flags: LongWord;
  end;
  PSegment = ^TSegment;

function dladdr(Address: Pointer; var Info: TDlInfo): LongInt; cdecl;
  external 'c';

function pthread_self: Pointer; cdecl; external 'c';
function pthread_get_stackaddr_np(t: Pointer): Pointer; cdecl; external 'c';
function pthread_get_stacksize_np(t: Pointer): csize_t; cdecl; external 'c';

const
  Signals: array[0..3] of LongInt = (SIGSEGV, SIGBUS, SIGILL, SIGFPE);
  RtlSignals: array[0..3] of LongInt =
    (RTL_SIGSEGV, RTL_SIGBUS, RTL_SIGILL, RTL_SIGFPE);

  SEGV_MAPERR = 1;
  SEGV_ACCERR = 2;
  BUS_ADRALN  = 1;
  BUS_ADRERR  = 2;
  BUS_OBJERR  = 3;

  SS_ONSTACK = $0001;
  SS_DISABLE = $0004;

var
  Previous, RtlAction: array[0..3] of SigActionRec;
  Installed: array[0..3] of Boolean;
  TextStart, TextEnd: PtrUInt;
  FaultHandlerInstalled: Boolean;
  FaultHandlerError: string;
  MainThreadAltStack: Pointer;
  MainThreadAltStackSize: PtrUInt;
  MainThreadAltStackInstalled: Boolean;

procedure FaultTrampoline(FaultPC, FaultAddr: Pointer; IsWrite: PtrUInt; Frame: Pointer);
var
  E: Exception;
  ReadWriteStr: string;
begin
  if IsWrite <> 0 then
    ReadWriteStr := 'Write'
  else
    ReadWriteStr := 'Read';
  E := EAccessViolation.Create(Format(
    'Access violation at address %p in module ''%s''. %s of address %p',
    [FaultPC, 'XEditLib.dll', ReadWriteStr, FaultAddr]));
  raise E at FaultPC, Frame;
end;

procedure StackOverflowTrampoline;
begin
  raise EStackOverflow.Create('Stack overflow');
end;

procedure InstallThreadAltStack(var Rec: TThreadAltStackRecord);
var
  NewSS: TSigAltStack;
begin
  Rec.AllocBase := nil;
  Rec.AllocSize := 0;
  Rec.Installed := False;
  FillChar(Rec.OldStack, SizeOf(Rec.OldStack), 0);

  if sigaltstack(nil, @Rec.OldStack) = 0 then begin
    if (Rec.OldStack.ss_flags and SS_DISABLE) <> 0 then begin
      Rec.AllocSize := 131072; // 128 KB total: 96 KB signal stack + 32 KB emergency region
      Rec.AllocBase := fpMmap(nil, Rec.AllocSize, PROT_READ or PROT_WRITE, MAP_PRIVATE or MAP_ANON, -1, 0);
      if PtrUInt(Rec.AllocBase) <> PtrUInt(-1) then begin
        NewSS.ss_sp := Rec.AllocBase;
        NewSS.ss_size := 98304; // 96 KB
        NewSS.ss_flags := 0;
        if sigaltstack(@NewSS, nil) = 0 then
          Rec.Installed := True
        else begin
          fpMunmap(Rec.AllocBase, Rec.AllocSize);
          Rec.AllocBase := nil;
          Rec.AllocSize := 0;
        end;
      end else
        Rec.AllocBase := nil;
    end;
  end;
end;

procedure RemoveThreadAltStack(var Rec: TThreadAltStackRecord);
var
  DisableSS: TSigAltStack;
begin
  if Rec.Installed then begin
    if (Rec.OldStack.ss_flags and SS_DISABLE) <> 0 then begin
      DisableSS.ss_sp := nil;
      DisableSS.ss_size := 0;
      DisableSS.ss_flags := SS_DISABLE;
      sigaltstack(@DisableSS, nil);
    end else
      sigaltstack(@Rec.OldStack, nil);
    Rec.Installed := False;
  end;
  if Assigned(Rec.AllocBase) and (PtrUInt(Rec.AllocBase) <> PtrUInt(-1)) then begin
    fpMunmap(Rec.AllocBase, Rec.AllocSize);
    Rec.AllocBase := nil;
    Rec.AllocSize := 0;
  end;
end;


function CallStackOriginatesInModule(PC, LR, FP, SP: PtrUInt): Boolean;
var
  CurFP, NextFP, RetAddr: PtrUInt;
  Steps: Integer;
begin
  Result := False;
  if (PC >= TextStart) and (PC < TextEnd) then
    Exit(True);
  if (LR >= TextStart) and (LR < TextEnd) then
    Exit(True);

  CurFP := FP;
  Steps := 0;
  while (Steps < 64) and (CurFP >= SP) and (CurFP < SP + 8388608) and ((CurFP and 7) = 0) do begin
    RetAddr := PPtrUInt(CurFP + 8)^;
    if (RetAddr >= TextStart) and (RetAddr < TextEnd) then
      Exit(True);
    NextFP := PPtrUInt(CurFP)^;
    if (NextFP <= CurFP) or (NextFP >= SP + 8388608) then
      Break;
    CurFP := NextFP;
    Inc(Steps);
  end;
end;

procedure ForwardToHost(Sig: cint; Info: PSigInfo; Context: PSigContext; I: Integer);
var
  Handler: SignalHandler;
  SavedMask, UnblockMask: sigset_t;
  NeedsMaskRestore: Boolean;
begin
  if PtrUInt(@Previous[I].sa_handler) = PtrUInt(SIG_IGN) then
    Exit;
  if PtrUInt(@Previous[I].sa_handler) = PtrUInt(SIG_DFL) then begin
    fpSigAction(Sig, @Previous[I], nil);
    if Assigned(Info) and (Info^.si_code <= 0) then
      fpKill(fpGetPid, Sig);
    Exit;
  end;

  NeedsMaskRestore := False;
  if PCardinal(@Previous[I].sa_mask)^ <> 0 then begin
    fpsigprocmask(SIG_BLOCK, @Previous[I].sa_mask, @SavedMask);
    NeedsMaskRestore := True;
  end;
  if (Previous[I].sa_flags and SA_NODEFER) <> 0 then begin
    fpsigemptyset(UnblockMask);
    fpsigaddset(UnblockMask, Sig);
    if not NeedsMaskRestore then begin
      fpsigprocmask(SIG_UNBLOCK, @UnblockMask, @SavedMask);
      NeedsMaskRestore := True;
    end else
      fpsigprocmask(SIG_UNBLOCK, @UnblockMask, nil);
  end;

  if (Previous[I].sa_flags and SA_RESETHAND) <> 0 then begin
    Previous[I].sa_handler := SigActionHandler(SIG_DFL);
    Previous[I].sa_flags := 0;
    fpsigemptyset(Previous[I].sa_mask);
  end;

  if (Previous[I].sa_flags and SA_SIGINFO) <> 0 then
    Previous[I].sa_handler(Sig, Info, Context)
  else begin
    Handler := SignalHandler(@Previous[I].sa_handler);
    Handler(Sig);
  end;

  if NeedsMaskRestore then
    fpsigprocmask(SIG_SETMASK, @SavedMask, nil);
end;

procedure DispatchFault(Sig: cint; Info: PSigInfo; Context: PSigContext); cdecl;
var
  I: Integer;
  PC, LR: PtrUInt;
  FaultPC, FaultAddr: Pointer;
  IsWrite: PtrUInt;
  EC: LongWord;
  IsInstructionAbort: Boolean;
  Handled: Boolean;
  CurThread: Pointer;
  StackTop, StackSize, StackBottom: PtrUInt;
  FaultSP, FaultAddrUInt: PtrUInt;
  IsStackOverflow: Boolean;
  CurSS: TSigAltStack;
  EmergencySP: PtrUInt;
begin
  for I := Low(Signals) to High(Signals) do
    if Sig = Signals[I] then begin
      Handled := False;
      if Assigned(Context) and Assigned(Context^.uc_mcontext) then begin
        PC := Context^.uc_mcontext^.__ss.__pc;
        if Assigned(Info) then begin
        end;


        if (Sig = SIGSEGV) or (Sig = SIGBUS) then begin
          if Assigned(Info) and
             (((Sig = SIGSEGV) and ((Info^.si_code = SEGV_MAPERR) or (Info^.si_code = SEGV_ACCERR))) or
              ((Sig = SIGBUS) and ((Info^.si_code = BUS_ADRALN) or (Info^.si_code = BUS_ADRERR) or (Info^.si_code = BUS_OBJERR)))) then
          begin
            LR := Context^.uc_mcontext^.__ss.__lr;
            EC := (Context^.uc_mcontext^.__es.__esr shr 26) and $3F;
            IsInstructionAbort := (EC = $20) or (EC = $21) or (PtrUInt(Info^.si_addr) = PC);
            CurThread := pthread_self;
            StackTop := PtrUInt(pthread_get_stackaddr_np(CurThread));
            StackSize := PtrUInt(pthread_get_stacksize_np(CurThread));
            if (StackSize > 0) and (StackTop > StackSize) then
              StackBottom := StackTop - StackSize
            else
              StackBottom := 0;

            FaultSP := Context^.uc_mcontext^.__ss.__sp;
            FaultAddrUInt := PtrUInt(Info^.si_addr);

            IsStackOverflow := False;
            if (StackBottom > 131072) and
               (((FaultAddrUInt >= StackBottom - 131072) and (FaultAddrUInt < StackBottom + 4096)) or
                ((FaultSP >= StackBottom - 131072) and (FaultSP < StackBottom + 4096) and
                 (Abs(Int64(FaultAddrUInt) - Int64(FaultSP)) < 65536))) then
              IsStackOverflow := True
            else if (Abs(Int64(FaultAddrUInt) - Int64(FaultSP)) <= 4096) then
              IsStackOverflow := True;

            if (PC >= TextStart) and (PC < TextEnd) then begin
              FaultPC := Pointer(PC);
              FaultAddr := Info^.si_addr;
              if (Context^.uc_mcontext^.__es.__esr and (LongWord(1) shl 6)) <> 0 then
                IsWrite := 1
              else
                IsWrite := 0;
              Handled := True;
            end else if IsInstructionAbort and (LR >= TextStart) and (LR < TextEnd) then begin
              FaultPC := Pointer(LR - 4);
              FaultAddr := Info^.si_addr;
              IsWrite := 0;
              Handled := True;
            end else if IsStackOverflow and CallStackOriginatesInModule(PC, LR, Context^.uc_mcontext^.__ss.__fp, FaultSP) then begin
              FaultPC := Pointer(PC);
              FaultAddr := Info^.si_addr;
              IsWrite := 0;
              Handled := True;
            end;

            if Handled then begin
              if IsStackOverflow then begin
                EmergencySP := 0;
                if sigaltstack(nil, @CurSS) = 0 then begin
                  if (CurSS.ss_flags and SS_DISABLE) = 0 then begin
                    if CurSS.ss_size = 98304 then
                      EmergencySP := (PtrUInt(CurSS.ss_sp) + 131072 - 32) and not PtrUInt(15)
                    else if CurSS.ss_size >= 32768 then
                      EmergencySP := (PtrUInt(CurSS.ss_sp) + CurSS.ss_size - 32) and not PtrUInt(15);
                  end;
                end;

                if EmergencySP <> 0 then begin
                  Context^.uc_mcontext^.__ss.__sp := EmergencySP;
                  Context^.uc_mcontext^.__ss.__pc := PtrUInt(@StackOverflowTrampoline);
                  Exit;
                end;
              end;

              Context^.uc_mcontext^.__ss.__r[0] := PtrUInt(FaultPC);
              Context^.uc_mcontext^.__ss.__r[1] := PtrUInt(FaultAddr);
              Context^.uc_mcontext^.__ss.__r[2] := IsWrite;
              Context^.uc_mcontext^.__ss.__r[3] := Context^.uc_mcontext^.__ss.__fp;
              Context^.uc_mcontext^.__ss.__pc := PtrUInt(@FaultTrampoline);
              Exit;
            end;
          end;
        end else begin
          if (PC >= TextStart) and (PC < TextEnd) then begin
            RtlAction[I].sa_handler(Sig, Info, Context);
            Exit;
          end;
        end;
      end;

      ForwardToHost(Sig, Info, Context, I);
      Exit;
    end;
end;

procedure RestoreFaultHandlers;
var
  I: Integer;
  Action: SigActionRec;
  DisableSS: TSigAltStack;
begin
  for I := Low(Signals) to High(Signals) do
    if Installed[I] then begin
      if (fpSigAction(Signals[I], nil, @Action) = 0) and
        (Pointer(@Action.sa_handler) = Pointer(@DispatchFault)) then
        fpSigAction(Signals[I], @Previous[I], nil);
      Installed[I] := False;
    end;
  if MainThreadAltStackInstalled then begin
    DisableSS.ss_sp := nil;
    DisableSS.ss_size := 0;
    DisableSS.ss_flags := SS_DISABLE;
    sigaltstack(@DisableSS, nil);
    MainThreadAltStackInstalled := False;
  end;
  if Assigned(MainThreadAltStack) and (PtrUInt(MainThreadAltStack) <> PtrUInt(-1)) then begin
    fpMunmap(MainThreadAltStack, MainThreadAltStackSize);
    MainThreadAltStack := nil;
    MainThreadAltStackSize := 0;
  end;
  FaultHandlerInstalled := False;
end;

procedure InstallFaultHandlers;
var
  Info: TDlInfo;
  Header: PMachHeader;
  Segment: PSegment;
  I: Integer;
  Action: SigActionRec;
  CurSS, NewSS: TSigAltStack;
begin
  try
    if dladdr(@InstallFaultHandlers, Info) = 0 then
      raise Exception.Create('Cannot locate native fault handler image');
    Header := PMachHeader(Info.ImageBase);
    if Header^.Magic <> $FEEDFACF then
      raise Exception.Create('Invalid native fault handler Mach-O header');
    Segment := PSegment(PtrUInt(Header) + SizeOf(TMachHeader));
    for I := 1 to Header^.CommandCount do begin
      if (Segment^.Command = $19) and (Segment^.Name = '__TEXT') then begin
        TextStart := PtrUInt(Header);
        TextEnd := TextStart + Segment^.VirtualSize;
        Break;
      end;
      Segment := PSegment(PtrUInt(Segment) + Segment^.Size);
    end;
    if TextEnd = 0 then
      raise Exception.Create('Cannot locate native fault handler text segment');

    // Query / install alternate stack on main thread if not already installed
    if sigaltstack(nil, @CurSS) = 0 then begin
      if (CurSS.ss_flags and SS_DISABLE) <> 0 then begin
        MainThreadAltStackSize := 131072; // 128 KB total (96 KB signal stack + 32 KB emergency region)
        MainThreadAltStack := fpMmap(nil, MainThreadAltStackSize, PROT_READ or PROT_WRITE, MAP_PRIVATE or MAP_ANON, -1, 0);
        if PtrUInt(MainThreadAltStack) <> PtrUInt(-1) then begin
          NewSS.ss_sp := MainThreadAltStack;
          NewSS.ss_size := 98304; // 96 KB
          NewSS.ss_flags := 0;
          if sigaltstack(@NewSS, nil) = 0 then
            MainThreadAltStackInstalled := True
          else begin
            fpMunmap(MainThreadAltStack, MainThreadAltStackSize);
            MainThreadAltStack := nil;
            MainThreadAltStackSize := 0;
          end;
        end else
          MainThreadAltStack := nil;
      end;
    end;

    for I := Low(Signals) to High(Signals) do begin
      if fpSigAction(Signals[I], nil, @Previous[I]) <> 0 then
        RaiseLastOSError;
      HookSignal(RtlSignals[I]);
      if fpSigAction(Signals[I], nil, @RtlAction[I]) <> 0 then
        RaiseLastOSError;
      Action := RtlAction[I];
      Action.sa_handler := @DispatchFault;
      if (Signals[I] = SIGSEGV) or (Signals[I] = SIGBUS) then
        Action.sa_flags := Action.sa_flags or $0001; // SA_ONSTACK
      if fpSigAction(Signals[I], @Action, nil) <> 0 then
        RaiseLastOSError;
      Installed[I] := True;
      AbandonSignalHandler(RtlSignals[I]);
    end;
    FaultHandlerInstalled := True;
  except
    on E: Exception do begin
      RestoreFaultHandlers;
      FaultHandlerInstalled := False;
      FaultHandlerError := E.Message;
    end;
  end;
end;

initialization
  InstallFaultHandlers;
finalization
  RestoreFaultHandlers;
{$ENDIF}
{$ENDIF}
{$ENDIF}
end.
