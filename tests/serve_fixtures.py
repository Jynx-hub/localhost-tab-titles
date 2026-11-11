"""Starts the demo projects for the e2e tests, prints their ports as JSON, and runs until stdin closes."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fixtures import Projects  # noqa: E402

# An app that keeps changing its own title, like a SPA router does.
SPA = """<!doctype html><title>Loading…</title><h1>demo</h1>
<script>setTimeout(() => { document.title = "Dashboard | Demo App"; }, 300);</script>"""

p = Projects()
try:
    late = os.path.join(p.root, "late-site")
    os.makedirs(late)
    ports = {
        "repo": p.serve(p.repo, SPA),
        # Screenshots pin this to a readable port (LTT_WORKTREE_PORT=3001).
        "worktree": p.serve(p.worktree, SPA, int(os.environ.get("LTT_WORKTREE_PORT", 0)) or None),
        "plain": p.serve(p.plain, "<!doctype html><title>Plain</title>"),
        # Only ever opened while the helper is missing, so nothing is cached for it.
        "late": p.serve(late, "<!doctype html><title>Late</title>"),
    }
    print(json.dumps(ports), flush=True)
    sys.stdin.read()
finally:
    p.close()
