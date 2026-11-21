; Preserve the registered directory when the public product name changes.
; This hook is included before Tauri defines PRODUCTNAME, so expand constants only in macros.
Var OpenBGALegacyName
Var OpenBGALegacyDirectory
Var OpenBGALegacyVersion
Var OpenBGALegacyList
Var OpenBGALegacyDuplicate

; Collect every validated former registration. The newest version is kept; on equal
; versions the later (more recent) product name wins.
!macro OPENBGA_FIND_LEGACY Publisher Product
  ReadRegStr $0 HKCU "Software\${Publisher}\${Product}" ""
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "Publisher"
  ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "MainBinaryName"
  ReadRegStr $3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "UninstallString"
  ${If} $1 == "${Publisher}"
  ${AndIf} $2 == "${MAINBINARYNAME}.exe"
  ${AndIf} $3 == '$\"$0\uninstall.exe$\"'
  ${AndIf} ${FileExists} "$0\${MAINBINARYNAME}.exe"
    ReadRegStr $5 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "DisplayVersion"
    StrCpy $OpenBGALegacyList "$OpenBGALegacyList$\r$\n- ${Product} $5 in $0"
    StrCpy $4 1
    ${If} $OpenBGALegacyDirectory != ""
      ${If} $OpenBGALegacyDirectory != $0
        StrCpy $OpenBGALegacyDuplicate 1
      ${EndIf}
      nsis_tauri_utils::SemverCompare $5 $OpenBGALegacyVersion
      Pop $4
    ${EndIf}
    ${If} $4 != -1
      StrCpy $OpenBGALegacyName "${Product}"
      StrCpy $OpenBGALegacyDirectory $0
      StrCpy $OpenBGALegacyVersion $5
    ${EndIf}
  ${EndIf}
!macroend

!macro OPENBGA_CHECK_LEGACY
  ${If} $OpenBGALegacyDuplicate == 1
    MessageBox MB_ICONSTOP "More than one previous installation exists:$\r$\n$OpenBGALegacyList$\r$\n$\r$\nKeep: $OpenBGALegacyName $OpenBGALegacyVersion in $OpenBGALegacyDirectory$\r$\n$\r$\nRemove the other installations in Windows Settings > Apps > Installed apps, then run the update again. Removing them does not remove the laboratory data: leave $\"Delete the application data$\" unchecked when the uninstaller asks." /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  !if "${ALLOWDOWNGRADES}" == "false"
    nsis_tauri_utils::SemverCompare "${VERSION}" $OpenBGALegacyVersion
    Pop $4
    ${If} $4 == -1
      MessageBox MB_ICONSTOP "A newer version is already installed." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
  !endif
!macroend

!macro OPENBGA_CHECK_SHORTCUT Directory
  ${If} ${FileExists} "${Directory}\${PRODUCTNAME}.lnk"
    !insertmacro IsShortcutTarget "${Directory}\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 != 1
      MessageBox MB_ICONSTOP "An unrelated shortcut already uses this product name. Resolve it before installing." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
  StrCpy $OpenBGALegacyDirectory ""
  StrCpy $OpenBGALegacyVersion ""
  StrCpy $OpenBGALegacyList ""
  StrCpy $OpenBGALegacyDuplicate ""
  ; A current-name registration takes priority; normal Tauri upgrade handling applies.
  ReadRegStr $0 HKCU "${MANUPRODUCTKEY}" ""
  ${If} $0 == ""
    !insertmacro OPENBGA_FIND_LEGACY "Vibe Toxicology LIS project" "Vibe Tox LIS"
    !insertmacro OPENBGA_FIND_LEGACY "OpenBGA" "OpenBGA Tox"
    !insertmacro OPENBGA_FIND_LEGACY "OpenBGA" "Steady State LIMS"
    ${If} $OpenBGALegacyDirectory != ""
      !insertmacro OPENBGA_CHECK_LEGACY
      ; NSIS has already parsed /D into INSTDIR. Detect its presence separately:
      ; an explicitly requested new default path is still different from a custom old root.
      ; NSIS removes /D from CMDLINE; inspect the raw Unicode Windows command line.
      System::Call 'kernel32::GetCommandLineW() w .r0'
      ${GetOptions} $0 "/D=" $0
      ${IfNot} ${Errors}
      ${AndIf} $INSTDIR != $OpenBGALegacyDirectory
        MessageBox MB_ICONSTOP "Choose the existing installation directory: $OpenBGALegacyDirectory" /SD IDOK
        SetErrorLevel 1
        Abort
      ${EndIf}
      ClearErrors
      ; Also reject a different directory selected in the graphical installer.
      ${If} $INSTDIR != "$LOCALAPPDATA\${PRODUCTNAME}"
      ${AndIf} $INSTDIR != $OpenBGALegacyDirectory
        MessageBox MB_ICONSTOP "Choose the existing installation directory: $OpenBGALegacyDirectory" /SD IDOK
        SetErrorLevel 1
        Abort
      ${EndIf}
      StrCpy $INSTDIR $OpenBGALegacyDirectory
      ; Tauri calls this hook after SetOutPath; update both before its File commands.
      SetOutPath $INSTDIR
    ${EndIf}
  ${EndIf}
  !insertmacro OPENBGA_CHECK_SHORTCUT "$SMPROGRAMS"
  !insertmacro OPENBGA_CHECK_SHORTCUT "$DESKTOP"
!macroend

!macro OPENBGA_MIGRATE_SHORTCUT Directory
  !insertmacro IsShortcutTarget "${Directory}\$OpenBGALegacyName.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
  Pop $0
  ${If} $0 == 1
    ; Preserve an unrelated existing link with the new public name.
    StrCpy $1 1
    ${If} ${FileExists} "${Directory}\${PRODUCTNAME}.lnk"
      !insertmacro IsShortcutTarget "${Directory}\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
      Pop $1
    ${EndIf}
    ${If} $1 == 1
    Delete "${Directory}\$OpenBGALegacyName.lnk"
    CreateShortcut "${Directory}\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "${Directory}\${PRODUCTNAME}.lnk"
    ${EndIf}
  ${EndIf}
!macroend

!macro OPENBGA_RETIRE_LEGACY Publisher Product
  ReadRegStr $0 HKCU "Software\${Publisher}\${Product}" ""
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "Publisher"
  ${If} $0 == $INSTDIR
  ${AndIf} $1 == "${Publisher}"
    StrCpy $OpenBGALegacyName "${Product}"
    !insertmacro OPENBGA_MIGRATE_SHORTCUT "$SMPROGRAMS"
    !insertmacro OPENBGA_MIGRATE_SHORTCUT "$DESKTOP"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}"
    DeleteRegKey HKCU "Software\${Publisher}\${Product}"
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ${If} $OpenBGALegacyDirectory != ""
    ; /UPDATE skips shortcut creation; retire only registrations at the selected root.
    !insertmacro OPENBGA_RETIRE_LEGACY "Vibe Toxicology LIS project" "Vibe Tox LIS"
    !insertmacro OPENBGA_RETIRE_LEGACY "OpenBGA" "OpenBGA Tox"
    !insertmacro OPENBGA_RETIRE_LEGACY "OpenBGA" "Steady State LIMS"
  ${EndIf}
!macroend
