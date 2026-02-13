@echo off
echo Starting Phone Shop System...

start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 5
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Servers started!
echo Frontend (Local): http://localhost:3000
echo Frontend (Network): http://0.0.0.0:3000 (Use your IP, e.g., 192.168.x.x)
echo Backend: http://0.0.0.0:3001
pause
