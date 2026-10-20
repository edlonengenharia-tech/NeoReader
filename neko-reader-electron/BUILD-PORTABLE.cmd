@echo off
chcp 65001 >nul
echo ============================================
echo   NekoReader - Gerar EXE Portatil
echo ============================================
echo.

:: Check Node.js
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

:: Install dependencies
echo [2/4] Instalando dependencias...
echo        (Sem canvas nativo - usa PDF.js no renderer)
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo        OK!
echo.

:: Build portable EXE
echo [3/4] Gerando EXE portatil (electron-builder)...
echo        Isso pode levar alguns minutos...
echo.

call npx electron-builder --win portable --x64
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao gerar EXE!
    echo Verifique se electron-builder esta instalado corretamente.
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
echo Voce pode copiar esse arquivo para qualquer
echo lugar e executar sem instalacao!
echo.

:: Open dist folder
explorer dist

pause
