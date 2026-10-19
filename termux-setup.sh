#!/data/data/com.termux/files/usr/bin/bash
# 知识图谱 · 安卓平板本地服务器（Termux）
# 用法：把本文件夹放到平板（或用 git clone），在 Termux 里执行 bash termux-setup.sh
set -e

PORT="${PORT:-8777}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== 知识图谱 · Termux 启动 =="
echo "目录：$DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "== 安装 Node.js（约 50MB，只需一次）=="
  pkg update -y
  pkg install -y nodejs
fi

# 申请存储权限（读取 /sdcard 里的文件需要）
if [ ! -d "/sdcard/Download" ] || [ ! -w "/sdcard/Download" ]; then
  echo "== 请求存储权限，请在弹窗里点允许 =="
  termux-setup-storage || true
  sleep 2
fi

# 阻止 CPU 休眠杀进程
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

IP=$(ip route get 1 2>/dev/null | awk '{print $NF; exit}')
echo ""
echo "  平板自己用： http://localhost:$PORT/"
[ -n "$IP" ] && echo "  同一 WiFi 的其他设备： http://$IP:$PORT/"
echo ""
echo "  提示：浏览器打开上面的地址 → 菜单「安装应用」→ 之后断网也能用。"
echo "  按 Ctrl+C 停止服务器。"
echo ""

cd "$DIR"
exec node serve.js
