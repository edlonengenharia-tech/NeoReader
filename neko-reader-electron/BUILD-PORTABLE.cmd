@echo off
echo ============================================
echo   NekoReader - Gerar EXE Portatil
echo ============================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Node.js encontrado:
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

echo [3/4] Gerando EXE portatil (electron-builder)...
echo        Isso pode levar alguns minutos...
echo.

set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win portable --x64
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao gerar EXE!
    echo.
    echo Tente executar o CMD como Administrador.
    echo Ou use: npx electron-builder --win dir --x64
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
