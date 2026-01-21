# -*- mode: python ; coding: utf-8 -*-

# -----------------------------
# 路径处理
# -----------------------------
from os.path import join, abspath
from os import getcwd

# 当前工作目录
current_dir = getcwd()

# -----------------------------
# PyInstaller Analysis
# -----------------------------
from PyInstaller.utils.hooks import collect_submodules
from PyInstaller.building.build_main import Analysis, PYZ, EXE, COLLECT

# 分析入口脚本
entry_script = abspath(join(current_dir, 'app.py'))  # 入口脚本

# -----------------------------
# Analysis 配置
# -----------------------------
a = Analysis(
    [entry_script],  # 入口脚本
    pathex=[current_dir],  # 搜索路径
    binaries=[],  # 二进制文件
    datas=[
        # 打包前端静态文件到 exe
        (abspath(join(current_dir, "dist")), "dist")
    ],
    hiddenimports=collect_submodules('webview'),  # pywebview 所有子模块
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

# -----------------------------
# PYZ
# -----------------------------
pyz = PYZ(a.pure)

# -----------------------------
# EXE 配置
# -----------------------------
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='agent-playground',
    icon=abspath(join(current_dir, 'dist', 'favicon.ico')),  # 图标
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # False 不显示控制台
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# -----------------------------
# COLLECT 配置
# -----------------------------
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='agent-playground',
)
