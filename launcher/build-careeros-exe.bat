@echo off
setlocal
title Build CareerOS.exe
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js est requis pour construire l'exe.
  echo https://nodejs.org/
  pause
  exit /b 1
)

echo Compilation de CareerOS.exe...
echo (La premiere fois, pkg telecharge une base Node pour Windows.)
echo.
call npx --yes @yao-pkg/pkg@5.16.1 launch.js --targets node18-win-x64 --output ..\CareerOS.exe
if errorlevel 1 (
  echo.
  echo [ERREUR] La compilation a echoue.
  pause
  exit /b 1
)

echo.
echo Termine ! CareerOS.exe a ete cree a la racine du projet.
echo Double-clique dessus pour lancer CareerOS.
pause
