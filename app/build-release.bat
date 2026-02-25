@echo off
echo ================================================
echo  Build APK Release - PrecosCerto
echo  Contorna limite 260 chars do Windows com junction
echo ================================================

REM Remove junction anterior se existir
if exist C:\b rmdir C:\b

REM Cria junction apontando para o diretório do projeto
mklink /J C:\b "%~dp0"
if errorlevel 1 (
    echo ERRO: Nao foi possivel criar junction em C:\b
    echo Verifique se voce tem permissao.
    pause
    exit /b 1
)

echo Junction criada: C:\b -> %~dp0
echo.
echo Executando assembleRelease...
echo.

cd /d C:\b\android
call gradlew.bat assembleRelease --no-daemon

if errorlevel 1 (
    echo.
    echo BUILD FALHOU!
    rmdir C:\b
) else (
    echo.
    echo ================================================
    echo  BUILD CONCLUIDO COM SUCESSO!
    echo  APK em: C:\b\android\app\build\outputs\apk\release\
    echo ================================================
    echo.
    echo Copiando APK para pasta original...
    if not exist "%~dp0android\app\build\outputs\apk\release\" (
        mkdir "%~dp0android\app\build\outputs\apk\release\"
    )
    copy /Y "C:\b\android\app\build\outputs\apk\release\*.apk" "%~dp0android\app\build\outputs\apk\release\"
    echo APK copiado para: %~dp0android\app\build\outputs\apk\release\
    rmdir C:\b
)

pause
