"""Drives the native messaging host and the installer the same way a browser would."""
import json
import os
import struct
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from fixtures import Projects, free_port  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = os.path.join(ROOT, "helper", "tab-names-host.py")


def frame(obj):
    data = json.dumps(obj).encode()
    return struct.pack("<I", len(data)) + data


def call(raw, cmd=None):
    out = subprocess.run(cmd or [sys.executable, HOST], input=raw, capture_output=True, timeout=10).stdout
    (length,) = struct.unpack("<I", out[:4])
    return json.loads(out[4 : 4 + length])


class HostTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = Projects()
        cls.repo_port = cls.p.serve(cls.p.repo)
        cls.wt_port = cls.p.serve(cls.p.worktree)
        cls.plain_port = cls.p.serve(cls.p.plain)

    @classmethod
    def tearDownClass(cls):
        cls.p.close()

    def test_worktree_name_and_branch(self):
        self.assertEqual(call(frame({"port": str(self.wt_port)})), {"name": "demo-app-feature", "branch": "feature-x"})

    def test_main_repo(self):
        self.assertEqual(call(frame({"port": str(self.repo_port)})), {"name": "demo-app", "branch": "main"})

    def test_non_git_folder_uses_folder_name(self):
        self.assertEqual(call(frame({"port": str(self.plain_port)})), {"name": "plain-site", "branch": ""})

    def test_unused_port(self):
        self.assertEqual(call(frame({"port": str(free_port())})), {})

    def test_bad_input_does_not_crash(self):
        self.assertEqual(call(frame({"port": "3000; rm -rf /"})), {})
        self.assertEqual(call(frame(["not", "a", "dict"])), {})
        self.assertEqual(call(struct.pack("<I", 5) + b"{oops"), {})
        self.assertEqual(call(b""), {})

    def test_ping(self):
        self.assertEqual(call(frame({"ping": True})), {"ok": True, "version": 1})


class InstallerTest(unittest.TestCase):
    def test_install_and_uninstall(self):
        with tempfile.TemporaryDirectory() as tmp:
            hosts = [os.path.join(tmp, "BrowserA", "NativeMessagingHosts"), os.path.join(tmp, "Browser B", "NativeMessagingHosts")]
            env = dict(os.environ, LTT_INSTALL_DIR=os.path.join(tmp, "install dir"), LTT_HOST_DIRS=":".join(hosts))
            r = subprocess.run(["bash", os.path.join(ROOT, "helper", "install.sh")], env=env, capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("Helper installed", r.stdout)
            for d in hosts:
                with open(os.path.join(d, "com.localhost_tab_titles.helper.json")) as f:
                    m = json.load(f)
                self.assertEqual(m["type"], "stdio")
                self.assertTrue(os.access(m["path"], os.X_OK))
                self.assertEqual(m["allowed_origins"], ["chrome-extension://ipkpcfbbpicilgfambbgcihgeeodgmlo/"])
            # The installed launcher (path with a space, bare env) answers like the browser expects.
            launcher = os.path.join(tmp, "install dir", "host")
            out = subprocess.run([launcher], input=frame({"ping": True}), capture_output=True, env={}, timeout=10).stdout
            self.assertEqual(json.loads(out[4:]), {"ok": True, "version": 1})

            r = subprocess.run(["bash", os.path.join(ROOT, "helper", "uninstall.sh")], env=env, capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            for d in hosts:
                self.assertFalse(os.path.exists(os.path.join(d, "com.localhost_tab_titles.helper.json")))
            self.assertFalse(os.path.exists(os.path.join(tmp, "install dir")))


if __name__ == "__main__":
    unittest.main()
