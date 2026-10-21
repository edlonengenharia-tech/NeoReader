@echo off
echo ============================================
echo   NekoReader - Teste Rapido
echo ============================================
echo.

REM Verificar Node.js em caminhos comuns
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js encontrado no PATH
    goto :run
)

if exist "C:\Program Files\nodejs\node.exe" (
    set PATH=C:\Program Files\nodejs;%PATH%
    echo [OK] Node.js encontrado
    goto :run
)

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%
    echo [OK] Node.js encontrado
    goto :run
)

echo [ERRO] Node.js nao encontrado!
echo.
echo Solucoes:
echo 1. Instale Node.js em: https://nodejs.org
echo 2. Ou execute manualmente: npm start
echo.
pause
exit /b 1

:run
echo.
echo [1/3] Versao do Node.js:
node --version
echo.

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

echo [3/3] Iniciando NekoReader...
echo.
call npx electron .

pause
