"""Shared test fixtures: a throwaway git repo + worktree + plain folder, each serving HTTP."""
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def git(*args, cwd):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


class Projects:
    """repo/ on main, repo-wt-feature/ worktree on feature-x, plain/ (not git)."""

    def __init__(self):
        self.root = os.path.realpath(tempfile.mkdtemp(prefix="ltt-"))
        self.repo = os.path.join(self.root, "demo-app")
        self.worktree = os.path.join(self.root, "demo-app-feature")
        self.plain = os.path.join(self.root, "plain-site")
        os.makedirs(self.repo)
        os.makedirs(self.plain)
        git("init", "-q", "-b", "main", cwd=self.repo)
        git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init", cwd=self.repo)
        git("worktree", "add", "-q", "-b", "feature-x", self.worktree, cwd=self.repo)
        self.servers = []

    def serve(self, directory, html=None, port=None):
        if html is not None:
            with open(os.path.join(directory, "index.html"), "w") as f:
                f.write(html)
        port = port or free_port()
        proc = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
            cwd=directory, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.servers.append(proc)
        for _ in range(50):
            try:
                socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
                return port
            except OSError:
                time.sleep(0.1)
        raise RuntimeError("test server didn't start")

    def close(self):
        for p in self.servers:
            p.terminate()
            p.wait()
        shutil.rmtree(self.root, ignore_errors=True)
