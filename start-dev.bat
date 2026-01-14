@echo off
echo ========================================
echo   Iniciando servidores de desarrollo
echo ========================================
echo.

echo Iniciando servidor Node.js (server.js)...
start "Node Server" cmd /k "node server.js"

echo Iniciando Angular (ng serve)...
start "Angular Dev Server" cmd /k "ng serve"

echo.
echo ========================================
echo   Ambos servidores iniciados!
echo ========================================
echo.
echo - Node Server: Revisa la ventana "Node Server"
echo - Angular: Revisa la ventana "Angular Dev Server"
echo.
