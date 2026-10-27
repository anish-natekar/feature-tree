# Feature Tree

Hierarchical planning as plain markdown. A tree of feature nodes lives in `features/` next to your code, versioned with it. Planning never edits project code.

Each node has a name (file name), an abstract (what and why), acceptance tests, priority-rated todos, open questions, an Implemented log, citations, and a size limit. Nodes link with `[[node]]` (Obsidian-compatible); external sources are normal URLs.

## Parts

- `features/SCHEMA.md` — the format. `features/robot-arm/` — sample tree.
- `skill/` — Claude skill (`SKILL.md`), helper CLI `scripts/ft.py` (stdlib Python: `lint`, `tree`, `next`, `todos`, `ask`, `questions`, `index`, `view`, `work`), optional Claude Code hooks (`hooks/`).
- `features/viewer.html` — standalone viewer/editor, no server (Chrome/Edge folder picker). Rebuild with `python3 skill/scripts/ft.py view`.
- `vscode-feature-tree/` — VS Code extension with the same graph and editor.

## Quick start

```bash
python3 skill/scripts/ft.py tree
python3 skill/scripts/ft.py next
python3 skill/scripts/ft.py lint
```

`ft work -- --permission-mode acceptEdits --allowedTools "Bash(python3 skill/scripts/ft.py:*)"` runs the work loop headlessly, one fresh `claude -p` per step, with a per-todo time limit (TLE) and stall detection.

## Tests

```bash
python3 -m unittest skill/tests/test_ft.py
cd vscode-feature-tree && npm install && npm test
```

## License

MIT
