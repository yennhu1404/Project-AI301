#!/bin/bash
# Script khởi chạy Hệ thống AI Agent Xử lý Cơ hội Bán hàng B2B - Minh An Company

PORT=8888
echo "=========================================================================="
echo "  🚀 AI301: HỆ THỐNG AI AGENT XỬ LÝ CƠ HỘI BÁN HÀNG B2B - MINH AN COMPANY"
echo "  🌸 Thiết kế theo phong cách DataLens Studio · Lê Yến Như (Nền Vàng Pastel)"
echo "=========================================================================="
echo "👉 Truy cập Web tại: http://localhost:${PORT}"
echo ""

# Sử dụng Python 3.10 có sẵn trên máy
if [ -f "/Applications/demo antigravity/env/bin/python3" ]; then
    echo "▶️ Đang khởi chạy với Python 3.10..."
    PORT=${PORT} "/Applications/demo antigravity/env/bin/python3" server.py
elif command -v python3 >/dev/null 2>&1; then
    echo "▶️ Đang khởi chạy với System Python 3..."
    PORT=${PORT} python3 server.py
else
    echo "▶️ Đang khởi chạy với Native Server..."
    PORT=${PORT} GEM_HOME=/tmp GEM_PATH=/tmp ruby app_server.rb
fi
