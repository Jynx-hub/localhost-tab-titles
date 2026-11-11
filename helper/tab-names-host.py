#!/usr/bin/env python3
"""Native messaging host for the Localhost Tab Titles extension.

The browser starts this program on demand, sends one message, and reads one reply:

  in:  {"port": "3000"}
  out: {"name": "my-app-feature-x", "branch": "feature-x"}   or {} if nothing resolves

Lookup: the process listening on the port -> its working directory -> the git repo or
worktree folder name and branch. A folder that isn't a git repo is reported by its name.

Messages use Chrome's native messaging framing: a 4-byte little-endian length, then JSON.
Only extension IDs listed in the host manifest's allowed_origins can start this program.
"""
import json
import os
import struct
import subprocess
import sys


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
        return {}
    out = run("lsof", "-a", "-p", pid, "-d", "cwd", "-Fn")
    cwd = next((line[1:] for line in out.splitlines() if line.startswith("n")), "")
    if not cwd or cwd == "/":
        return {}
    return git_info(cwd)


def read_message():
    header = sys.stdin.buffer.read(4)
    if len(header) != 4:
        return None
    (length,) = struct.unpack("<I", header)
    if length > 1024 * 1024:
        return None
    try:
        return json.loads(sys.stdin.buffer.read(length))
    except ValueError:
        return None


def send_message(obj):
    data = json.dumps(obj).encode()
    sys.stdout.buffer.write(struct.pack("<I", len(data)) + data)
    sys.stdout.buffer.flush()


def handle(msg):
    if not isinstance(msg, dict):
        return {}
    if msg.get("ping"):
        return {"ok": True, "version": 1}
    port = str(msg.get("port", ""))
    return lookup(port) if port.isdigit() else {}


if __name__ == "__main__":
    send_message(handle(read_message()))
