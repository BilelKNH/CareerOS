@echo off
setlocal
title CareerOS - Arret
cd /d "%~dp0"
echo Arret de CareerOS...
docker compose down
echo Termine.
pause
