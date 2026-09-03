Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!include "MUI2.nsh"

!ifndef APP_VERSION
  !error "APP_VERSION is required"
!endif
!ifndef FILE_VERSION
  !error "FILE_VERSION is required"
!endif
!ifndef STAGE_DIR
  !error "STAGE_DIR is required"
!endif
!ifndef OUT_FILE
  !error "OUT_FILE is required"
!endif
!ifndef APP_ICON
  !error "APP_ICON is required"
!endif

Name "SWE-Quant Tracker"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\SWEQuantTracker"
InstallDirRegKey HKCU "Software\SWEQuantTracker" "InstallLocation"
RequestExecutionLevel user
Icon "${APP_ICON}"
UninstallIcon "${APP_ICON}"
BrandingText "SWE-Quant Tracker"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "${FILE_VERSION}"
VIAddVersionKey "ProductName" "SWE-Quant Tracker"
VIAddVersionKey "FileDescription" "SWE-Quant Tracker local tray service"
VIAddVersionKey "CompanyName" "Kasu724"
VIAddVersionKey "LegalCopyright" "Copyright © 2026 Kasu724"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\SWEQuantTracker.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start SWE-Quant Tracker"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  nsExec::ExecToLog 'taskkill.exe /IM SWEQuantTracker.exe /T /F'
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\server"
  RMDir /r "$INSTDIR\runtime"
  RMDir /r "$INSTDIR\migrations"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\LICENSES.chromium.html"
  Delete "$INSTDIR\LICENSE.electron.txt"

  SetOutPath "$INSTDIR"
  File /r "${STAGE_DIR}\*"

  CreateDirectory "$SMPROGRAMS\SWE-Quant Tracker"
  CreateShortcut "$SMPROGRAMS\SWE-Quant Tracker\SWE-Quant Tracker.lnk" "$INSTDIR\SWEQuantTracker.exe" "" "$INSTDIR\SWEQuantTracker.exe"
  CreateShortcut "$DESKTOP\SWE-Quant Tracker.lnk" "$INSTDIR\SWEQuantTracker.exe" "" "$INSTDIR\SWEQuantTracker.exe"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\SWEQuantTracker" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "DisplayName" "SWE-Quant Tracker"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "DisplayIcon" "$INSTDIR\SWEQuantTracker.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "Publisher" "Kasu724"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill.exe /IM SWEQuantTracker.exe /T /F'
  Delete "$DESKTOP\SWE-Quant Tracker.lnk"
  RMDir /r "$SMPROGRAMS\SWE-Quant Tracker"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SWEQuantTracker"
  DeleteRegKey HKCU "Software\SWEQuantTracker"
  RMDir /r "$INSTDIR"
SectionEnd
