#!/usr/bin/env python3
"""Stand-in for `claude -p PROMPT`. FT_FAKE: done (check off next todo) | noop | hang_all | hang_first. Logs prompts to FT_FAKE_LOG."""
import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import ft
from pathlib import Path

prompt = sys.argv[sys.argv.index("-p") + 1]
mode = os.environ.get("FT_FAKE", "done")
with open(os.environ["FT_FAKE_LOG"], "a") as f:
    kind = next((k for k in ("Triage", "Split", "Research", "Work loop") if k in prompt), "?")
    f.write(kind + "\n")
root = Path("features").resolve()
nodes = ft.load(root)
if "Triage" in prompt:
    for n in nodes:
        p = n.path.read_text().replace("(P?)", "(P1)")
        n.path.write_text(p)
elif "Split node" in prompt:
    name = prompt.split("Split node ")[1].split(" ")[0]
    n = next(x for x in nodes if x.name == name)
    n.path.write_text(ft.replace_section(n.path.read_text(), "Todos", ""))
elif "Work loop" in prompt:
    pick, _ = ft.pick_next(nodes)
    if mode == "hang_all" or (mode == "hang_first" and "first" in pick[2]):
        time.sleep(60)
    if mode != "noop":
        n = next(x for x in nodes if x.rel == pick[1])
        lines = [l for l in n.path.read_text().splitlines(keepends=True) if pick[2] not in l]
        n.path.write_text("".join(lines))
