# Feature Tree

A map of a project that a human can read, steer and trust while agents write the code.

Agents now write more code than anyone can review line by line. What a person can still review is intent, decisions, facts and capabilities. The feature tree is that map, kept as plain markdown in `features/` next to the code and versioned with it. Each node is one feature: what it is and why (Abstract), how it works in plain language (Methodology), how to know it works (Acceptance Tests), what is left (Todos), what needs a decision (Questions), and what is known and built (Implemented, Facts & Details). Nodes link with `[[node]]` and the files open cleanly in Obsidian. The tree sits one step above the code: detailed at the leaves, abstract near the root, and never tied to a programming language.

## The loop

Agents work from the tree, and the human steers it.

- **Agents** pick the next ready todo, build it, run its tests, tick it off, then write up what now exists. When a decision blocks them they log a question and move to other work. Unattended, they may take the recommended option of a multiple-choice question, flagged as unconfirmed.
- **Humans** read one briefing (`ft status`): progress, what needs a human, what the agent can do alone. They answer questions, confirm or reopen agent assumptions, mark todos that need a person, and pause everything with one command. `ft digest` shows what changed while they were away.

The markdown is the only shared state, so nothing is lost when a session ends or context is cleared.

## Parts

- `features/SCHEMA.md`: the format. `features/feature-tree/`: this project's own plan, written with itself.
- `skill/`: the Claude Code skill (`SKILL.md`), the helper CLI (`scripts/ft.py`, standard-library Python only), and optional hooks (`hooks/`, see its README).
- `features/viewer.html`: a single-file viewer, no server. It opens with a snapshot of the plan, read-only; pick the `features/` folder (Chrome or Edge) to go live and edit. Rebuild it with `ft view`.
- `vscode-feature-tree/`: a VS Code extension with the same graph and editor.

## Try it

```bash
python3 skill/scripts/ft.py status      # the briefing: progress, what needs you
python3 skill/scripts/ft.py tree        # the hierarchy
python3 skill/scripts/ft.py next        # what an agent would do next
python3 skill/scripts/ft.py digest      # what changed since yesterday
python3 skill/scripts/ft.py view        # build features/viewer.html
python3 skill/scripts/ft.py lint        # check the plan
```

Starting on an existing codebase: `ft init` scaffolds a draft tree from it, then interview and refine.

## Autonomy

```bash
python3 skill/scripts/ft.py work -- --permission-mode acceptEdits --allowedTools "Bash(python3 skill/scripts/ft.py:*)"
```

`ft work` runs the loop headlessly, one fresh `claude -p` per step, with a time limit per todo and stall detection. It stops when the human runs `ft pause`, and `ft resume` continues. `ft status` prints `AGENT IDLE` when nothing is left that the agent can do alone.

To have every Claude Code session start from the briefing and refuse to end with half-finished bookkeeping, wire up the hooks in `skill/hooks/README.md`.

## Tests

```bash
python3 -m unittest discover -s skill/tests
cd vscode-feature-tree && npm install && npm test
```

## License

MIT
