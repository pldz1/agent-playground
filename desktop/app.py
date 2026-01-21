import os
import time
import ctypes
import shutil
import threading
import webbrowser
from pathlib import Path

import uvicorn
import webview
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# -----------------------------
# 路径处理
# -----------------------------
current_file = Path(__file__).resolve()
current_dir = current_file.parent
parent_path = current_dir.parent

# -----------------------------
# 读取 .env 文件
# -----------------------------
env_path = parent_path / ".env"
load_dotenv(dotenv_path=env_path)

# 当前目录下的 dist
local_dist = current_dir / "dist"


# -----------------------------
# 获取环境变量
# -----------------------------
DESKTOP_APP_HOST = os.getenv("DESKTOP_APP_HOST", "127.0.0.1")
DESKTOP_APP_PORT = int(os.getenv("DESKTOP_APP_PORT", "10088"))

# -----------------------------
# FastAPI 应用
# -----------------------------
app = FastAPI()
app.mount("/", StaticFiles(directory=local_dist, html=True), name="static")

# -----------------------------
# 控制台模式 (Windows)
# -----------------------------


def set_console_mode():
    if os.name != "nt":
        return  # 仅在 Windows 执行

    STD_INPUT_HANDLE = -10
    kernel32 = ctypes.windll.kernel32
    hStdin = kernel32.GetStdHandle(STD_INPUT_HANDLE)

    mode = ctypes.c_ulong()
    kernel32.GetConsoleMode(hStdin, ctypes.byref(mode))

    # 禁用快速编辑和插入模式
    new_mode = mode.value & ~0x0040 & ~0x0020
    kernel32.SetConsoleMode(hStdin, new_mode)
    print("QUICK_EDIT_MODE and INSERT_MODE are disabled!")

# -----------------------------
# PyWebView JS API
# -----------------------------


class API:
    """暴露给 JavaScript 的接口"""

    def open_external(self, url: str):
        try:
            webbrowser.open(url)
            print(f"Opened in browser: {url}")
        except Exception as e:
            print(f"Failed to open {url}: {e}")

# -----------------------------
# 窗口关闭确认
# -----------------------------


def on_closing(window):
    response = ctypes.windll.user32.MessageBoxW(
        0, "确定退出吗？", "退出确认", 1
    )
    if response == 1:  # 点击“确定”
        os._exit(0)
    else:
        return False  # 取消关闭

# -----------------------------
# 启动 FastAPI 服务
# -----------------------------


def start_server():
    uvicorn.run(app, host=DESKTOP_APP_HOST, port=DESKTOP_APP_PORT)

# -----------------------------
# 启动 PyWebView 窗口
# -----------------------------


def start_webview():
    api = API()
    window = webview.create_window(
        title="Agent Playground",
        url=f"http://{DESKTOP_APP_HOST}:{DESKTOP_APP_PORT}",
        js_api=api,
        width=1200,
        height=800,
        min_size=(800, 600),
        resizable=True,
        fullscreen=False,
        confirm_close=True
    )

    window.events.closing += on_closing

    # JS 注入：重写 window.open
    def override_window_open():
        js_code = """
        window.open = function(url) {
            if (window.pywebview && window.pywebview.api) {
                window.pywebview.api.open_external(url);
            } else {
                console.log('pywebview API not available');
            }
        }
        """
        window.evaluate_js(js_code)
        print("window.open 已被重写：将使用默认浏览器打开链接")

    window.events.loaded += lambda: override_window_open()
    webview.start()


# -----------------------------
# 主入口
# -----------------------------
if __name__ == "__main__":
    set_console_mode()

    # 启动 FastAPI 服务线程
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 等待 FastAPI 启动
    time.sleep(1)  # 简单等待，也可以用端口 ping 检查

    # 启动桌面窗口
    start_webview()
