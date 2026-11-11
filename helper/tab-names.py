#!/usr/bin/env python3
"""Local lookup helper for the Localhost Tab Titles extension (optional).

GET http://127.0.0.1:47123/?port=3000 -> {"name": "my-app-feature-x", "branch": "feature-x"}

Finds the process listening on the port, takes its working directory, and reports the
git worktree folder name and branch. If the directory isn't a git repo, the folder name is used.

Security:
  * Binds to 127.0.0.1 only.
  * Sends no CORS headers, so web pages can't read responses; only the extension can.
  * Rejects requests whose Host header isn't 127.0.0.1/localhost (blocks DNS-rebinding).
"""
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("TAB_NAMES_PORT", "47123"))
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}


def run(*cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=3).stdout.strip()
    except Exception:
        return ""


def git_info(path):
    top = run("git", "-C", path, "rev-parse", "--show-toplevel")
    if not top:
        return {"name": os.path.basename(path.rstrip("/")), "branch": ""}
    return {"name": os.path.basename(top), "branch": run("git", "-C", top, "branch", "--show-current")}


def lookup(port):
    pid = run("lsof", "-nP", f"-tiTCP:{port}", "-sTCP:LISTEN").split("\n")[0]
    if not pid:
        return None
    out = run("lsof", "-a", "-p", pid, "-d", "cwd", "-Fn")
    cwd = next((line[1:] for line in out.splitlines() if line.startswith("n")), "")
    if not cwd or cwd == "/":
        return None
    return git_info(cwd)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.headers.get("Host") not in ALLOWED_HOSTS:
            self.send_error(403)
            return
        port = parse_qs(urlparse(self.path).query).get("port", [""])[0]
        info = lookup(port) if port.isdigit() else None
        body = json.dumps(info or {}).encode()
        self.send_response(200 if info else 404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    try:
        server = HTTPServer(("127.0.0.1", PORT), Handler)
    except OSError as e:
        sys.exit(f"tab-names: can't listen on 127.0.0.1:{PORT} ({e})")
    server.serve_forever()
