#!/usr/bin/env python3
"""Claude Code hooks for the feature tree. Usage (from settings.json): ft_hook.py lint|stop|context
Reads the hook JSON on stdin. Exit 2 + stderr = feedback to the model; stdout on SessionStart = context."""
import json, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "scripts"))
import ft  # noqa: E402


def payload():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def features_root(data):
    d = Path(data.get("cwd") or ".")
    return d / "features" if (d / "features").is_dir() else None


def hook_lint(data):
    """PostToolUse on Edit/Write: lint the tree when a features/ markdown file changed."""
    fp = (data.get("tool_input") or {}).get("file_path", "")
    root = features_root(data)
    if not root or "/features/" not in fp.replace("\\", "/") or not fp.endswith(".md"):
        return 0
    errs = [p for p in ft.lint(ft.load(root), root) if p[0] == "ERROR"]
    if errs:
        print("ft lint errors (fix before continuing):\n" + "\n".join(f"{n.rel}: {m}" for _, n, m in errs), file=sys.stderr)
        return 2
    return 0


def hook_stop(data):
    """Stop: refuse to end the turn while a checkpoint is half done. Only blocks once per stop (stop_hook_active)."""
    root = features_root(data)
    if not root or data.get("stop_hook_active") or ft.pause_reason(root):
        return 0  # paused by a human: let the agent stop cleanly, no checkpoint nagging
    nodes = ft.load(root)
    problems = []
    for n, kind, ident in ft.unreflected(nodes):
        problems.append(f"{n.rel}: confirmed {kind} {ident!r} not yet reflected; run `ft reflect {n.name} --{kind} ... --note \"...\"`")
    for n in nodes:
        for t in n.todos_full:
            if t["pri"] == ft.UNASSIGNED:
                problems.append(f"{n.rel}: todo '{t['text'][:40]}' still P?; assign a priority")
        if n.meta.get("status") == "done" and any(not t["done"] for t in n.todos_full):
            problems.append(f"{n.rel}: status done but open todos remain")
    if problems:
        print("Checkpoint incomplete:\n" + "\n".join(problems), file=sys.stderr)
        return 2
    return 0


def hook_context(data):
    """SessionStart: put the tree summary and next todo into context so a fresh session needs no recall."""
    root = features_root(data)
    if not root:
        return 0
    py = sys.executable
    for args in (["status"], ["digest", "--since", "1 day ago"], ["next"]):
        out = subprocess.run([py, str(HERE.parent / "scripts" / "ft.py"), "--root", str(root), *args], capture_output=True, text=True).stdout
        print(f"$ ft {' '.join(args)}\n{out}")
    return 0


if __name__ == "__main__":
    sys.exit({"lint": hook_lint, "stop": hook_stop, "context": hook_context}[sys.argv[1]](payload()))
