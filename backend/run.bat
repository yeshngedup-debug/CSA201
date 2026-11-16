@echo off
rem Teru Care backend launcher
rem Compiles every run (takes about a second) so edited sources are never
rem served stale — a stale out\ tree is how CORS/endpoint fixes appear to
rem "not work" — then starts the API server on port 8090.
cd /d "%~dp0"

echo Compiling backend...
dir /s /b src\*.java > sources.txt
javac -encoding UTF-8 -d out @sources.txt
if errorlevel 1 (
    echo Compile failed.
    del sources.txt >nul 2>nul
    pause
    exit /b 1
)
del sources.txt >nul 2>nul

echo Starting Teru Care backend on http://localhost:8090 ...
java -cp out terucare.Main
pause
