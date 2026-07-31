@echo off
setlocal
title CareerOS
cd /d "%~dp0"

echo ============================================
echo             Lancement de CareerOS
echo ============================================
echo.

REM --- Docker requis ---
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Docker Desktop est requis et introuvable.
  echo Installe Docker Desktop puis relance ce fichier.
  echo https://www.docker.com/products/docker-desktop/
  echo.
  pause
  exit /b 1
)

REM --- .env cree au premier lancement ---
if not exist ".env" (
  echo Premier lancement : creation du fichier .env depuis .env.example
  copy ".env.example" ".env" >nul
  echo   ^> Pense a renseigner JWT_SECRET / JWT_REFRESH_SECRET dans .env
  echo.
)

echo Construction et demarrage des conteneurs (Postgres, Redis, API, Web)...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERREUR] Le demarrage a echoue. Verifie que Docker Desktop tourne.
  pause
  exit /b 1
)

echo.
echo Initialisation de la base de donnees (schema + donnees de demo)...
docker compose exec -T api sh -lc "cd /app && pnpm --filter @careeros/database exec prisma db push --accept-data-loss && pnpm --filter @careeros/database exec tsx prisma/seed.ts"

echo.
echo Attente du demarrage du front...
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try{ if((Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2).StatusCode -eq 200){exit 0} }catch{}; exit 1" >nul 2>nul
  if not errorlevel 1 goto ready
  timeout /t 2 >nul
)

:ready
echo.
echo ============================================
echo   CareerOS est lance !
echo   Web  : http://localhost:3000
echo   API  : http://localhost:3001/api
echo   Demo : bilelknh@gmail.com / careeros
echo ============================================
start "" http://localhost:3000
echo.
echo (Laisse cette fenetre ouverte. Pour arreter : stop-careeros.bat)
pause
