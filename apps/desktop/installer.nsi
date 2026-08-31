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

Name "FAANG Quant Tracker"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\FAANGQuantTracker"
InstallDirRegKey HKCU "Software\FAANGQuantTracker" "InstallLocation"
RequestExecutionLevel user
Icon "${APP_ICON}"
UninstallIcon "${APP_ICON}"
BrandingText "FAANG Quant Tracker"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "${FILE_VERSION}"
VIAddVersionKey "ProductName" "FAANG Quant Tracker"
VIAddVersionKey "FileDescription" "FAANG Quant Tracker local tray service"
VIAddVersionKey "CompanyName" "Kasu724"
VIAddVersionKey "LegalCopyright" "Copyright © 2026 Kasu724"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\FAANGQuantTracker.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start FAANG Quant Tracker"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  nsExec::ExecToLog 'taskkill.exe /IM FAANGQuantTracker.exe /T /F'
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

  CreateDirectory "$SMPROGRAMS\FAANG Quant Tracker"
  CreateShortcut "$SMPROGRAMS\FAANG Quant Tracker\FAANG Quant Tracker.lnk" "$INSTDIR\FAANGQuantTracker.exe" "" "$INSTDIR\FAANGQuantTracker.exe"
  CreateShortcut "$DESKTOP\FAANG Quant Tracker.lnk" "$INSTDIR\FAANGQuantTracker.exe" "" "$INSTDIR\FAANGQuantTracker.exe"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\FAANGQuantTracker" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "DisplayName" "FAANG Quant Tracker"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "DisplayIcon" "$INSTDIR\FAANGQuantTracker.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "Publisher" "Kasu724"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill.exe /IM FAANGQuantTracker.exe /T /F'
  Delete "$DESKTOP\FAANG Quant Tracker.lnk"
  RMDir /r "$SMPROGRAMS\FAANG Quant Tracker"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FAANGQuantTracker"
  DeleteRegKey HKCU "Software\FAANGQuantTracker"
  RMDir /r "$INSTDIR"
SectionEnd
