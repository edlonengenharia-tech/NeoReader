@echo off
echo ============================================
echo   NekoReader - Gerar EXE Portatil
echo ============================================
echo.

REM Verificar Node.js em caminhos comuns
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js encontrado no PATH
    goto :install
)

REM Tentar caminhos comuns do Node.js
if exist "C:\Program Files\nodejs\node.exe" (
    set PATH=C:\Program Files\nodejs;%PATH%
    echo [OK] Node.js encontrado em C:\Program Files\nodejs
    goto :install
)

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%
    echo [OK] Node.js encontrado em %LOCALAPPDATA%\Programs\nodejs
    goto :install
)

if exist "%APPDATA%\nvm\current\node.exe" (
    set PATH=%APPDATA%\nvm\current;%PATH%
    echo [OK] Node.js encontrado via nvm
    goto :install
)

echo [ERRO] Node.js nao encontrado!
echo.
echo Solucoes:
echo 1. Instale Node.js em: https://nodejs.org
echo 2. Ou execute os comandos manualmente:
echo    - npm install
echo    - npx electron-builder --win portable
echo.
pause
exit /b 1

:install
echo.
echo [1/4] Versao do Node.js:
node --version
echo.

echo [2/4] Instalando dependencias...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo        OK!
echo.

echo [3/4] Gerando EXE portatil...
echo        Isso pode levar alguns minutos...
echo.

set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win portable --x64
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao gerar EXE!
    echo.
    echo Tente:
    echo 1. Executar o CMD como Administrador
    echo 2. Ou usar: npx electron-builder --win dir --x64
    pause
    exit /b 1
)

echo.
echo [4/4] Concluido!
echo.
echo ============================================
echo   EXE gerado em: dist\NekoReader-portable.exe
echo ============================================
echo.

if exist "dist\NekoReader-portable.exe" (
    echo Abrindo pasta dist...
    explorer dist
) else (
    echo [AVISO] EXE nao encontrado. Verifique a pasta dist.
)

pause
