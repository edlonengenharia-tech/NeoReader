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

echo [1/5] Node.js encontrado:
node --version
echo.

:: Limpar cache do winCodeSign (problema de symbolic links do macOS)
echo [2/5] Limpando cache do electron-builder...
if exist "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" (
    rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" 2>nul
    echo        Cache limpo!
) else (
    echo        Cache ja limpo.
)
echo.

:: Install dependencies
echo [3/5] Instalando dependencias...
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
echo [4/5] Gerando EXE portatil (electron-builder)...
echo        Isso pode levar alguns minutos...
echo.

:: Desativar assinatura de código para evitar problemas de symbolic links
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win portable --x64
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao gerar EXE!
    echo.
    echo Possiveis solucoes:
    echo 1. Execute o CMD como Administrador
    echo 2. Verifique se tem espaco em disco suficiente
    echo 3. Tente novamente apos reiniciar o PC
    pause
    exit /b 1
)

echo.
echo [5/5] Concluido!
echo.
echo ============================================
echo   EXE gerado em: dist\NekoReader-portable.exe
echo ============================================
echo.
echo Voce pode copiar esse arquivo para qualquer
echo lugar e executar sem instalacao!
echo.

:: Open dist folder
if exist "dist\NekoReader-portable.exe" (
    explorer dist
) else (
    echo [AVISO] EXE nao encontrado em dist\
    echo Verifique a pasta dist manualmente.
)

pause
