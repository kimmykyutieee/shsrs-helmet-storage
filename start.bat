@echo off
cd /d "%~dp0"
echo Starting SHSRS (API + app)... keep this window open.
call npm start
pause
