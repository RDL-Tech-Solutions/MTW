@echo off
echo ==========================================
echo LIMPEZA COMPLETA EXPO - Fix Android Error
echo ==========================================
echo.

echo [1/6] Parando Expo...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/6] Removendo node_modules...
if exist node_modules rmdir /s /q node_modules

echo [3/6] Removendo .expo cache...
if exist .expo rmdir /s /q .expo

echo [4/6] Removendo package-lock.json...
if exist package-lock.json del /f /q package-lock.json

echo [5/6] Limpando cache global do Expo...
npx expo start -c --reset-cache
timeout /t 2 /nobreak >nul
taskkill /F /IM node.exe 2>nul

echo [6/6] Reinstalando dependencias...
call npm install

echo.
echo ==========================================
echo LIMPEZA CONCLUIDA!
echo ==========================================
echo.
echo Proximos passos:
echo 1. Verifique se o arquivo .env existe e tem o IP correto
echo 2. Execute: npx expo start -c
echo 3. Pressione 'a' para Android
echo.
pause
