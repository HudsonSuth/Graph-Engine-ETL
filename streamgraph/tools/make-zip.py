#!/usr/bin/env python3
"""Zip the project for hand-off: python3 tools/make-zip.py [out.zip]
Leaves out node_modules, .git, data folders, uploads, logs, secrets, SQLite databases, jars/classes, downloaded runtimes
(.runtime, explore/er/lib, Python venvs) and the jars built from source (rebuild with npm run setup:processing)."""
import os, re, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "streamgraph-integrated.zip")
SKIP_DIRS = {"node_modules", ".git", "data", "uploads", "logs", ".runtime", ".venv", "venv", "__pycache__", "test-results"}
SKIP_PATHS = {"explore/er/lib", "explore/flink/build", "explore/er/build", "explore/er/.venv"}
SKIP_FILE = re.compile(r"(\.jar|\.class|\.db|\.db-wal|\.db-shm|\.sqlite|\.log|\.pyc)$|^secrets|\.env$|^\.env", re.I)
n = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, dirs, files in os.walk(ROOT):
        rel = os.path.relpath(d, ROOT).replace("\\", "/")
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and (f"{rel}/{x}" if rel != "." else x) not in SKIP_PATHS)
        for f in sorted(files):
            if SKIP_FILE.search(f): continue
            p = os.path.join(d, f)
            z.write(p, os.path.join("streamgraph-integrated", os.path.relpath(p, ROOT)))
            n += 1
print(f"{OUT}: {n} files, {os.path.getsize(OUT) / 1e6:.1f} MB")
