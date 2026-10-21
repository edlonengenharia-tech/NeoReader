@echo off
setlocal
cd /d "%~dp0"
title NekoReader - criar executavel
echo ==========================================
echo   NekoReader - gerar .exe para Windows
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node 22 LTS em https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo Node detectado: %%v
echo.

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 goto erro

echo [2/3] Compilando o app...
call npm run build
if errorlevel 1 goto erro

echo [3/3] Gerando o executavel (a primeira vez demora alguns minutos)...
call npx electron-builder --win portable
if errorlevel 1 goto erro

echo.
echo Pronto! O executavel esta na pasta release.
if exist release start "" "release"
pause
exit /b 0

:erro
echo.
echo [ERRO] A etapa acima falhou. Copie a mensagem e mande para mim.
pause
exit /b 1
