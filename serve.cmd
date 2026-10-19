@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found & pause & exit /b 1)
node serve.js
pause
