!include "MUI2.nsh"

Name "Dreko Games Launcher"
OutFile "..\release\Dreko Games Launcher Setup.exe"
InstallDir "$PROGRAMFILES64\Dreko Games Launcher"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
XPStyle on
CRCCheck on
BrandingText "Dreko Games"

!define APP_NAME "Dreko Games Launcher"
!define APP_EXE "Dreko Games Launcher.exe"

!ifndef MUI_ICON
!define MUI_ICON "icon.ico"
!endif
!ifndef MUI_UNICON
!define MUI_UNICON "icon.ico"
!endif
!ifndef MUI_ABORTWARNING
!define MUI_ABORTWARNING
!endif
!ifndef MUI_UNABORTWARNING
!define MUI_UNABORTWARNING
!endif
!ifndef MUI_LANGDLL_ALWAY_SHOW
!define MUI_LANGDLL_ALWAY_SHOW
!endif
!ifndef MUI_LANGDLL_REGISTRY_ROOT
!define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
!endif
!ifndef MUI_LANGDLL_REGISTRY_KEY
!define MUI_LANGDLL_REGISTRY_KEY "Software\DrekoGames\Launcher"
!endif
!ifndef MUI_LANGDLL_REGISTRY_VALUENAME
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"
!endif
!ifndef MUI_HEADERIMAGE
!define MUI_HEADERIMAGE
!endif
!ifndef MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_RIGHT
!endif
!ifndef MUI_HEADERIMAGE_BITMAP
!define MUI_HEADERIMAGE_BITMAP "installer-header.bmp"
!endif
!ifndef MUI_WELCOMEFINISHPAGE_BITMAP
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-header.bmp"
!endif
!ifndef MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!endif
!ifndef MUI_FINISHPAGE_RUN_TEXT
!define MUI_FINISHPAGE_RUN_TEXT "Launch Dreko Games Launcher"
!endif
!ifndef MUI_FINISHPAGE_LINK
!define MUI_FINISHPAGE_LINK "https://dreko8u.web.app"
!endif
!ifndef MUI_FINISHPAGE_LINK_LOCATION
!define MUI_FINISHPAGE_LINK_LOCATION "https://dreko8u.web.app"
!endif
!ifndef MUI_FINISHPAGE_LINK_TEXT
!define MUI_FINISHPAGE_LINK_TEXT "Visit Dreko Games"
!endif

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Arabic"

Var InstallerLanguage

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
  StrCpy $InstallerLanguage ${LANG_ENGLISH}
FunctionEnd

Section "Main"
  SetOutPath "$INSTDIR"
  File /r "..\release\win-unpacked\*.*"

  CreateShortCut "$DESKTOP\Dreko Games Launcher.lnk" "$INSTDIR\${APP_EXE}"

  CreateDirectory "$SMPROGRAMS\Dreko Games Launcher"
  CreateShortCut "$SMPROGRAMS\Dreko Games Launcher\Dreko Games Launcher.lnk" "$INSTDIR\${APP_EXE}"

  WriteRegStr HKCU "Software\DrekoGames\Launcher" "InstallDir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Dreko Games Launcher.lnk"
  RMDir /r "$SMPROGRAMS\Dreko Games Launcher"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\DrekoGames\Launcher"
SectionEnd
