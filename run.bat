@echo off
rem ============================================================
rem Teru Care: Personal Finance & Expense Tracker
rem Runs both the Java backend and React Vite dev server
rem ============================================================

rem --- Configuration ---
set "ROOT=."
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%"
set "JAVA_PORT=8090"
set "VITE_PORT=8443"

rem --- Always get the latest files from git ---
echo.
echo ==== Updating from git ====
cd /d "%ROOT%"
git status >nul 2>&1 || echo.
echo Checking for updates...
git pull --rebase --stat 2>&1 | findstr /R /C:"^ " | find /V "Up to date" >nul
if %errorlevel% equ 0 (
    echo Updates applied.
) else (
    echo No new updates or git not available.
)
echo.

rem --- Java Backend Setup ---
echo ==== Java Backend ===
cd /d "%BACKEND_DIR%"

rem Compile the Java backend
echo Compiling Java sources...
javac -encoding UTF-8 -d out ^
  src/main/java/terucare/Main.java ^
  src/main/java/terucare/dsa/HashTable.java ^
  src/main/java/terucare/dsa/BinarySearchTree.java ^
  src/main/java/terucare/dsa/Stack.java ^
  src/main/java/terucare/dsa/MergeSort.java ^
  src/main/java/terucare/model/Expense.java ^
  src/main/java/terucare/service/ExpenseService.java ^
  src/main/java/terucare/service/UndoManager.java ^
  src/main/java/terucare/store/FileStore.java ^
  src/main/java/terucare/server/ApiServer.java ^
  src/main/java/terucare/server/Json.java 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Java compilation FAILED. Check errors above.
    pause
    exit /b 1
)
echo.
echo Java compilation succeeded.

rem --- Start Java Backend ---
echo.
echo Starting Java backend on port %JAVA_PORT%...
java -cp out terucare.Main %JAVA_PORT% > backend.log 2>&1 &
set BACKEND_PID=%!

rem Wait for backend to start
echo Waiting for backend to be ready...
timeout /t 3 /nobreak >nul
for /L %i in (1,1,10) do (
    curl -s http://localhost:%JAVA_PORT%/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo Backend is running.
        goto backend_ready
    )
    timeout /t 1 /nobreak >nul
)
echo.
echo WARNING: Backend may not have started properly.
echo Check backend.log for details.
goto continue

:backend_ready
echo.

:continue
rem --- Frontend Setup ---
echo ==== Frontend (React + Vite) ===
cd /d "%FRONTEND_DIR%"

rem Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing npm dependencies (first run only)...
    npm install 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo npm install FAILED. Check output above.
        pause
        exit /b 1
    )
    echo.
}

rem Start the Vite dev server
echo Starting Vite dev server on port %VITE_PORT%...
vite dev --port %VITE_PORT% > frontend.log 2>&1 &
set VITE_PID=%%

echo.
echo ============================================
echo  Teru Care is now running!
echo  Frontend: http://localhost:%VITE_PORT%
echo  Backend API: http://localhost:%JAVA_PORT%/api
echo  Press Ctrl+C to stop both servers
echo ============================================

rem --- Keep the script running and handle cleanup ---
echo.
:wait
timeout /t 15 /nobreak >nul
if not exist "%BACKEND_DIR%\out\%~n0.class" (
    echo Backend process may have stopped.
)
tasklist /FI "PID eq %BACKEND_PID%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Backend process has stopped.
    echo To restart run: run.bat
    goto stop
)

tasklist /FI "PID eq %VITE_PID%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Frontend process has stopped.
    echo To restart run: run.bat
    goto stop
)

rem Check if user pressed Ctrl+C (errorlevel 1 on timeout)
if errorlevel 1 goto stop
goto wait

:stop
echo.
echo Stopping servers...
taskkill /PID %BACKEND_PID% /F >nul 2>&1 || true
taskkill /PID %VITE_PID% /F >nul 2>&1 || true
echo.
echo Both servers stopped.
echo
echo Logs:
echo  Backend:  backend.log
echo  Frontend: frontend.log
pause