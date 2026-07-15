; RedHawk - Dependency Check & Install
; Included by electron-builder NSIS at the end of the main installer script.
; Prompts the user to check and install missing dependencies post-install.

!ifndef REDHAWK_DEPS_NSH
!define REDHAWK_DEPS_NSH

!include LogicLib.nsh

Section -"DependencyCheck" SEC_DEPS
  ; Ask user if they want to check dependencies (but only if running silently / from builder)
  ; In interactive mode, show a message box
  ${If} ${Silent}
    ; Running silently — skip prompt, auto-check
    DetailPrint "Checking dependencies (silent mode)..."
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "RedHawk needs optional external tools:$\r$\n$\r$\n\
       🔍  Nmap — port scanning$\r$\n\
       🐍  Python 3 + pip — script runtime$\r$\n\
        📦  Node.js — dependency for some tools$\r$\n\
        🎣  Evilginx2 — phishing framework$\r$\n\
       💥  Metasploit — exploitation framework$\r$\n\
       🐧  WSL — Linux subsystem$\r$\n$\r$\n\
       Check and install missing tools now?" \
      /SD IDYES IDNO deps_skip

    ; User clicked Yes — run the dependency installer
    DetailPrint "Checking and installing dependencies..."
  ${EndIf}

  ; Run the PowerShell dependency installer
  ; $INSTDIR\resources\scripts\install-deps.ps1 is extracted by electron-builder's default sections
  IfFileExists "$INSTDIR\resources\scripts\install-deps.ps1" deps_run deps_not_found

deps_run:
  DetailPrint "Running: install-deps.ps1 (this may take several minutes)..."
  nsExec::ExecToLog \
    'powershell.exe -ExecutionPolicy Bypass -NoProfile -File "$INSTDIR\resources\scripts\install-deps.ps1" -Auto -Silent'
  Pop $0
  DetailPrint "Dependency installer finished (exit code: $0)."
  Goto deps_done

deps_not_found:
  DetailPrint "Warning: install-deps.ps1 not found at expected location."
  DetailPrint "Path checked: $INSTDIR\resources\scripts\install-deps.ps1"
  Goto deps_done

deps_skip:
  DetailPrint "Dependency check skipped by user."

deps_done:
SectionEnd

!endif
