; Preserve the registered directory when the public product name changes.
; This hook is included before Tauri defines PRODUCTNAME, so expand constants only in macros.
Var OpenBGALegacyName
Var OpenBGALegacyDirectory

!macro OPENBGA_FIND_LEGACY Publisher Product
  ReadRegStr $0 HKCU "Software\${Publisher}\${Product}" ""
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "Publisher"
  ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "MainBinaryName"
  ReadRegStr $3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "UninstallString"
  ${If} $1 == "${Publisher}"
  ${AndIf} $2 == "${MAINBINARYNAME}.exe"
  ${AndIf} $3 == '$\"$0\uninstall.exe$\"'
  ${AndIf} ${FileExists} "$0\${MAINBINARYNAME}.exe"
    ${If} $OpenBGALegacyDirectory != ""
    ${AndIf} $OpenBGALegacyDirectory != $0
      MessageBox MB_ICONSTOP "More than one previous installation exists. Resolve the duplicate installations before updating." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
      !if "${ALLOWDOWNGRADES}" == "false"
        ReadRegStr $4 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${Product}" "DisplayVersion"
        nsis_tauri_utils::SemverCompare "${VERSION}" $4
        Pop $4
        ${If} $4 == -1
          MessageBox MB_ICONSTOP "A newer version is already installed." /SD IDOK
          SetErrorLevel 1
          Abort
        ${EndIf}
      !endif
    StrCpy $OpenBGALegacyName "${Product}"
    StrCpy $OpenBGALegacyDirectory $0
  ${EndIf}
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
  ; A current-name registration takes priority; normal Tauri upgrade handling applies.
  ReadRegStr $0 HKCU "${MANUPRODUCTKEY}" ""
  ${If} $0 == ""
    !insertmacro OPENBGA_FIND_LEGACY "Vibe Toxicology LIS project" "Vibe Tox LIS"
    !insertmacro OPENBGA_FIND_LEGACY "OpenBGA" "OpenBGA Tox"
    !insertmacro OPENBGA_FIND_LEGACY "OpenBGA" "Steady State LIMS"
    ${If} $OpenBGALegacyDirectory != ""
      ; NSIS has already parsed /D into INSTDIR. Detect its presence separately:
      ; an explicitly requested new default path is still different from a custom old root.
      ${GetOptions} $CMDLINE "/D=" $0
      ${IfNot} ${Errors}
      ${AndIf} $INSTDIR != $OpenBGALegacyDirectory
        MessageBox MB_ICONSTOP "Choose the existing installation directory: $OpenBGALegacyDirectory" /SD IDOK
        SetErrorLevel 1
        Abort
      ${EndIf}
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
