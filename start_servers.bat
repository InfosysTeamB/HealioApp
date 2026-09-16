@echo off
echo ===================================================
echo Starting Healio Patient Management System...
echo ===================================================

echo [1/2] Launching Django Backend Server (Port 8000)...
start "Healio Backend (Django)" cmd /k "cd /d %~dp0healio-backend && .\venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

timeout /t 3 /nobreak > nul

echo [2/2] Launching Angular Frontend Server (Port 4200)...
start "Healio Frontend (Angular)" cmd /k "cd /d %~dp0healio-frontend && npm start"

timeout /t 5 /nobreak > nul

echo Opening browser at http://localhost:4200/login...
start http://localhost:4200/login

echo Both servers have been launched!
echo - Backend:  http://localhost:8000/api/v1/
echo - Frontend: http://localhost:4200/
