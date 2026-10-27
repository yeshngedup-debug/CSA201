@echo off
setlocal EnableExtensions

rem ==========================================================================
rem  FinTrack / Teru Care - stop the whole stack
rem
rem  Closes the backend API and the Vite dev server that start.bat launched.
rem  Two mechanisms are used, in order:
rem    1. kill the console windows by their titles (exact, safe)
rem    2. if a port is still occupied by *our* app, kill the process holding it
rem       (the API must identify itself as "Teru Care" before we touch it, so
rem        an unrelated program on the same port is never killed)
rem ==========================================================================

title FinTrack stopper

set "API_PORT=8090"
set "APP_PORT=8443"

echo ==========================================================
echo   Stopping FinTrack
echo ==========================================================
echo.

call :kill_window "Teru Care API"
call :kill_window "FinTrack Dev Server"

rem Give the processes a moment to release their ports.
timeout /t 2 /nobreak >nul

call :kill_own_port %API_PORT% "http://localhost:%API_PORT%/api/health" "Teru Care"
call :kill_own_port %APP_PORT% "http://localhost:%APP_PORT%" ""

echo.
call :report %API_PORT% "Backend API"
call :report %APP_PORT% "Dev server"

echo.
echo Done. Press any key to close.
pause >nul
endlocal
exit /b 0

rem ---------- helpers -----------------------------------------------------

rem :kill_window <title prefix>
:kill_window
taskkill /FI "WINDOWTITLE eq %~1*" /T /F >nul 2>nul
if not errorlevel 1 echo [ok] Closed window "%~1".
exit /b 0

rem :kill_own_port <port> <health url> <expected text>
:kill_own_port
set "PORT=%~1"
set "KILL_PID="

rem Collect every PID listening on the port.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /i /c:"LISTENING" ^| findstr /c:":%PORT% "') do (
    set "KILL_PID=%%p"
)

if not defined KILL_PID (
    exit /b 0
)

rem Only proceed when the service on that port is provably ours.
if not "%~3"=="" (
    curl.exe -s -m 2 "%~2" 2>nul | findstr /c:"%~3" >nul
    if errorlevel 1 (
        echo [skip] Port %PORT% is held by another program - left untouched.
        exit /b 0
    )
)

echo [..] Killing process %KILL_PID% holding port %PORT%...
taskkill /PID %KILL_PID% /T /F >nul 2>nul
if not errorlevel 1 echo [ok] Freed port %PORT%.
exit /b 0

rem :report <port> <label>
:report
curl.exe -s -o NUL -m 2 "http://localhost:%~1" >nul 2>nul
if errorlevel 1 (
    echo [ok] %~2 on port %~1 is stopped.
) else (
    echo [WARN] Something still answers on port %~1 - close it manually.
)
exit /b 0
