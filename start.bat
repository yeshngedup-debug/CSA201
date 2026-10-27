@echo off
setlocal EnableExtensions

rem ==========================================================================
rem  FinTrack / Teru Care - full stack launcher
rem
rem  Starts everything needed to use the app:
rem    1. checks Java + Node.js are installed
rem    2. installs frontend dependencies on first run
rem    3. compiles the Java backend (always, so sources are never stale)
rem    4. launches the backend API on port 8090 in its own window
rem    5. launches the Vite dev server on port 8443 in its own window
rem    6. waits until both actually answer, then opens the app in a browser
rem
rem  Usage:
rem    start.bat              normal start + open browser
rem    start.bat /nobrowser   start without opening a browser
rem    start.bat /nopause     do not wait for a keypress at the end (scripts)
rem
rem  Services that are already running are detected and reused instead of
rem  being started twice. Use stop.bat to shut the whole stack down.
rem ==========================================================================

title FinTrack launcher

rem Capture our own folder BEFORE the argument loop: `shift` also moves %0,
rem which would turn %~dp0 into the drive root and send every later path to
rem C:\ . Every path below is absolute for that reason.
set "ROOT=%~dp0"

rem ---------- configuration ------------------------------------------------
set "API_PORT=8090"
set "APP_PORT=8443"
set "API_URL=http://localhost:%API_PORT%/api/health"
set "APP_URL=http://localhost:%APP_PORT%"
set "WAIT_SECONDS=40"

set "OPEN_BROWSER=1"
set "DO_PAUSE=1"

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="/nobrowser" set "OPEN_BROWSER=0"
if /i "%~1"=="/nopause"   set "DO_PAUSE=0"
shift
goto :parse_args
:args_done

echo ==========================================================
echo   FinTrack - Expense Tracker  (Teru Care, CSA201)
echo ==========================================================
echo.

rem ---------- 1. prerequisites --------------------------------------------

where java >nul 2>nul
if errorlevel 1 (
    echo [FAIL] Java was not found on PATH.
    echo        Install a JDK 17 or newer, reopen the terminal, and retry.
    goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
    echo [FAIL] Node.js was not found on PATH.
    echo        Install Node.js 20 or newer, reopen the terminal, and retry.
    goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [FAIL] npm was not found on PATH - reinstall Node.js.
    goto :fail
)

set "HAVE_CURL=0"
where curl.exe >nul 2>nul
if not errorlevel 1 set "HAVE_CURL=1"
if "%HAVE_CURL%"=="0" echo [WARN] curl.exe not found - health checks will use a fixed delay.

echo [ok] Java and Node.js are installed.

rem ---------- 2. frontend dependencies ------------------------------------

if not exist "%ROOT%node_modules\vite\package.json" (
    echo [..] Installing frontend dependencies ^(first run only^)...
    pushd "%ROOT%"
    call npm install
    set "NPM_RESULT=%ERRORLEVEL%"
    popd
    if not "%NPM_RESULT%"=="0" (
        echo [FAIL] npm install failed. Check your network connection.
        goto :fail
    )
)
echo [ok] Frontend dependencies are present.

rem ---------- 3. compile the backend -------------------------------------

echo [..] Compiling the Java backend...
if not exist "%ROOT%backend\out" mkdir "%ROOT%backend\out"
set "SOURCE_LIST=%TEMP%\fintrack-sources.txt"
dir /s /b "%ROOT%backend\src\*.java" > "%SOURCE_LIST%"
javac -encoding UTF-8 -d "%ROOT%backend\out" @"%SOURCE_LIST%"
set "JAVAC_RESULT=%ERRORLEVEL%"
del "%SOURCE_LIST%" >nul 2>nul

if not "%JAVAC_RESULT%"=="0" (
    echo [FAIL] Backend compilation failed - see the javac errors above.
    goto :fail
)
echo [ok] Backend compiled from source.

rem ---------- 4. backend API ---------------------------------------------

call :probe "%API_URL%"
if "%PROBE_OK%"=="1" (
    echo [ok] Backend is already running on port %API_PORT% - reusing it.
) else (
    echo [..] Starting backend API on port %API_PORT%...
    pushd "%ROOT%backend"
    start "Teru Care API :%API_PORT%" cmd /k "java -cp out terucare.Main"
    popd
    call :wait_http "%API_URL%" "Backend API"
    if "%WAIT_OK%"=="0" (
        echo        The backend window shows the reason. Port %API_PORT% may
        echo        already be used by another program.
        goto :fail
    )
)

rem ---------- 5. frontend dev server --------------------------------------

call :probe "%APP_URL%"
if "%PROBE_OK%"=="1" (
    echo [ok] Dev server is already running on port %APP_PORT% - reusing it.
) else (
    echo [..] Starting Vite dev server on port %APP_PORT%...
    pushd "%ROOT%"
    start "FinTrack Dev Server :%APP_PORT%" cmd /k "npm run dev -- --port %APP_PORT% --strictPort"
    popd
    call :wait_http "%APP_URL%" "Dev server"
    if "%WAIT_OK%"=="0" (
        echo        The dev server window shows the reason.
        goto :fail
    )
)

rem ---------- 6. ready ----------------------------------------------------

echo.
echo ==========================================================
echo   FinTrack is running
echo ----------------------------------------------------------
echo   App      : %APP_URL%
echo   API      : http://localhost:%API_PORT%/api
echo   Health   : %API_URL%
echo   Storage  : backend\data\expenses.json
echo ----------------------------------------------------------
echo   Shortcuts: Ctrl+N new expense, Ctrl+Z undo, Esc close
echo   Stop     : run stop.bat, or close the two service windows
echo ==========================================================
echo.

if "%OPEN_BROWSER%"=="1" start "" "%APP_URL%"

if "%DO_PAUSE%"=="1" (
    echo Press any key to close this launcher ^(the app keeps running^).
    pause >nul
)

endlocal
exit /b 0

rem ---------- helpers -----------------------------------------------------

rem :probe <url>  ->  PROBE_OK=1 when the URL already answers
:probe
set "PROBE_OK=0"
if not "%HAVE_CURL%"=="1" exit /b 0
curl.exe -s -o NUL -m 2 "%~1" >nul 2>nul
if not errorlevel 1 set "PROBE_OK=1"
exit /b 0

rem :wait_http <url> <label>  ->  WAIT_OK=1 once it answers (or after timeout)
:wait_http
set "WAIT_OK=0"
if not "%HAVE_CURL%"=="1" (
    ping -n 8 127.0.0.1 >nul
    set "WAIT_OK=1"
    exit /b 0
)
set /a WAIT_TRIES=0
:wait_loop
set /a WAIT_TRIES+=1
curl.exe -s -o NUL -m 2 "%~1" >nul 2>nul
if not errorlevel 1 (
    set "WAIT_OK=1"
    echo [ok] %~2 answered after %WAIT_TRIES% second^(s^).
    exit /b 0
)
if %WAIT_TRIES% GEQ %WAIT_SECONDS% exit /b 0
timeout /t 1 /nobreak >nul
goto :wait_loop

rem ---------- failure -----------------------------------------------------

:fail
echo.
echo Startup aborted - the app is not fully running.
if "%DO_PAUSE%"=="1" (
    echo Press any key to close.
    pause >nul
)
endlocal
exit /b 1
