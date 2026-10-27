@echo off
rem Teru Care backend launcher
rem Compiles once if needed, then runs the API server on port 8090.
cd /d "%~dp0"

if not exist "out\terucare\Main.class" (
    echo Compiling backend...
    dir /s /b src\*.java > sources.txt
    javac -encoding UTF-8 -d out @sources.txt
    if errorlevel 1 (
        echo Compile failed.
        pause
        exit /b 1
    )
    del sources.txt
)

echo Starting Teru Care backend on http://localhost:8090 ...
java -cp out terucare.Main
pause
