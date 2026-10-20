@echo off
chcp 65001 >nul
echo ============================================
echo   NekoReader - Teste Rapido
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

echo [1/3] Node.js: 
node --version
echo.

:: Install if needed
if not exist "node_modules" (
    echo [2/3] Instalando dependencias...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha na instalacao!
        pause
        exit /b 1
    )
    echo        OK!
) else (
    echo [2/3] Dependencias ja instaladas.
)
echo.

:: Run app
echo [3/3] Iniciando NekoReader...
echo.
call npx electron .

pause
