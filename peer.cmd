@echo off
cd /d "%~dp0"
if "%~1"=="" (
  echo 用法：peer.cmd 平板IP
  echo 例如：peer.cmd 192.168.1.23
  echo 平板 IP 在 Termux 启动时的输出里能看到
  pause
  exit /b 1
)
set PEER=http://%~1:8777
echo 对端同步：%PEER%
node serve.js
pause
