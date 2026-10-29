# Using Feature Tree

Feature Tree keeps your project plan as markdown under `features/`. A person reads and steers it in a viewer. A coding agent (Claude Code or Codex) reads and updates the same files through a small CLI, `ft`. This guide covers install, setup, and daily use.

Contents: [Install](#1-install) · [Set up a project](#2-set-up-a-project) · [Viewer](#3-see-the-tree) · [Claude Code](#4-use-with-claude-code) · [Codex](#5-use-with-codex) · [Daily loop](#6-the-daily-loop) · [Troubleshooting](#7-troubleshooting)

## 1. Install

Needs: Python 3.9+ (the CLI uses only the standard library). Node 18+ only if you build the VS Code extension. Git is recommended (`ft digest` reads history).

```bash
git clone https://github.com/anish-natekar/feature-tree.git ~/tools/feature-tree
```

Make `ft` easy to call. Pick one:

```bash
# shell alias (add to ~/.bashrc or ~/.zshrc)
alias ft='python3 ~/tools/feature-tree/skill/scripts/ft.py'
```

The CLI works on `./features` by default. Use `ft --root path/to/features ...` for another folder.

### Install the skill (so the agent knows the workflow)

The skill is the folder `skill/` (its `SKILL.md` teaches the agent the commands and the loop). Copy or link it where your agent looks for skills.

| Agent | Per-user location | Per-project location |
|---|---|---|
| Claude Code | `~/.claude/skills/feature-tree/` | `.claude/skills/feature-tree/` |
| Codex | `~/.codex/skills/feature-tree/` | see [Codex](#5-use-with-codex) |

```bash
mkdir -p ~/.claude/skills ~/.codex/skills
ln -s ~/tools/feature-tree/skill ~/.claude/skills/feature-tree
ln -s ~/tools/feature-tree/skill ~/.codex/skills/feature-tree
```

The skill's commands are written as `python3 skill/scripts/ft.py`. In your own project the script lives elsewhere, so tell the agent the real path once (see the snippet in [section 4](#4-use-with-claude-code)).

### Install the VS Code extension (optional)

The extension shows the tree as a graph and edits nodes in place. It is a local install, not on the Marketplace.

```bash
cd ~/tools/feature-tree/vscode-feature-tree
npm install
npm run compile
npx @vscode/vsce package          # makes feature-tree-0.1.0.vsix
code --install-extension feature-tree-0.1.0.vsix
```

Reload VS Code. The extension turns on by itself in any workspace that contains `features/SCHEMA.md`.

If a fix does not show up after an update, the installed copy is stale. Reinstall the `.vsix` and reload the window.

## 2. Set up a project

New project, or an existing codebase.

```bash
cd my-project
ft init            # existing code: scans README and top-level folders, writes a rough draft tree
```

For an empty project, copy `features/SCHEMA.md` from this repo into `my-project/features/`, then create the root and children:

```bash
ft new - my-app                 # root node
ft new my-app billing           # child under my-app
ft new billing invoices         # grandchild
ft index && ft lint             # regenerate links, check the plan
```

`ft init` only writes a draft. Refine it by asking your agent to interview you (see [Plan mode](#plan-mode-build-the-tree)). A good node is plain language: what it is, how it behaves, how to know it works. No function or file names. Detailed at the leaves, abstract near the root. Full rules: `features/SCHEMA.md`.

Commit `features/` with your code. The markdown is the only shared state.

## 3. See the tree

Three ways, all reading the same files.

**VS Code graph panel.** Click the Feature Tree icon in the activity bar, or run the command `Feature Tree: Open Graph`. Click a card to open its drawer: read and edit Abstract, Methodology, tests, todos, questions. Answer multiple-choice questions, confirm or reopen agent assumptions, tick todos. Right-click a `features/**/*.md` file, Open With, `Feature Node`, for a single-node editor.

**Standalone viewer.** No server, no install.

```bash
ft view            # writes features/viewer.html
```

Open `features/viewer.html` in any browser. It shows a read-only snapshot. In Chrome or Edge, click **change folder** and pick your `features/` folder to go live and save edits. Re-run `ft view` to refresh the snapshot.

**Terminal.**

```bash
ft status          # briefing: progress, what needs you, what the agent can do alone
ft tree            # hierarchy with status and rollup percentages
ft digest          # what changed since yesterday (ft digest --since "3 days ago")
```

Status colors: blue planned, amber in-progress, green done. Status is computed from the todos; `ft index` writes it. You do not set it by hand.

## 4. Use with Claude Code

Works the same in the terminal CLI, the VS Code extension, and the desktop app. All three read the same skill, the same `CLAUDE.md`, and the same hooks.

### One-time project wiring

Add a short block to your project `CLAUDE.md` so the agent uses the tree and knows where `ft` is:

```markdown
## Feature tree
The plan lives in features/ (format: features/SCHEMA.md). Use the feature-tree skill.
CLI: python3 ~/tools/feature-tree/skill/scripts/ft.py   (call it `ft` below)
- Start every session with `ft status`. Pick work only with `ft next`.
- Planning never edits code. Run `ft lint` after every edit under features/.
- Before ending: tick finished todos [x], run `ft reflect --check`, `ft index`, `ft lint`.
```

Allow the commands so the agent does not prompt every time. In `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Bash(python3 ~/tools/feature-tree/skill/scripts/ft.py:*)"]
  }
}
```

### Optional hooks (recommended)

Hooks make the loop self-enforcing: each session starts from the briefing, `ft lint` runs after plan edits, and a turn cannot end with half-finished bookkeeping.

1. Copy `skill/hooks/settings.example.json` into `.claude/settings.json` (merge with what you have).
2. Change the hook paths to where `ft_hook.py` lives, for example `~/tools/feature-tree/skill/hooks/ft_hook.py`.
3. Restart Claude Code.

Details: `skill/hooks/README.md`.

### Plan mode: build the tree

Tell the agent:

> Use the feature-tree skill. Interview me about this project and build the tree under features/. Ask what you need, cite node and question id, keep nodes plain-language.

It runs `ft reflect --check`, reads `ft tree`, asks you questions, writes nodes, then runs `ft index` and `ft lint`. If you step away, it logs questions with `ft ask` and keeps going.

### Work loop: build from the tree

> Use the feature-tree skill. Work the tree until `ft status` shows AGENT IDLE.

The agent repeats: `ft next` (never from memory), implement, run the node's acceptance test, tick the todo `[x]`, `ft index && ft lint`. A decision it cannot make becomes a question plus `{blocked: Qn}` on the todo, and it moves on. It stops at AGENT IDLE, which means only human items remain.

### Unattended runs

```bash
ft work -- --permission-mode acceptEdits --allowedTools "Bash(python3 ~/tools/feature-tree/skill/scripts/ft.py:*)" "Bash(npm test:*)"
```

`ft work` starts a fresh `claude -p` session per step, with a time limit per todo (`--task-limit`), stall detection, and a cap on timeouts (`--max-tle`). It adds no permission flags itself, so you choose how much to allow. `ft work --dry-run` shows the plan without running. `ft pause` stops it, `ft resume` continues.

## 5. Use with Codex

Codex reads the same skill format and the same plain markdown. Differences from Claude Code:

- **Skill:** link the skill into `~/.codex/skills/feature-tree` (shown in [Install](#1-install)). Codex lists it by the `name` and `description` in `SKILL.md` and loads it when a task matches. You can also name it: "use the feature-tree skill".
- **Instructions file:** put the same "Feature tree" block from section 4 into your project `AGENTS.md`, which Codex reads. This is the reliable path even if a skill is not picked up.
- **Hooks:** the shipped hooks are Claude Code settings. Without them, add the bookkeeping rule to `AGENTS.md` (as in the block above) and run `ft reflect --check && ft lint` yourself before committing.
- **Unattended:** `ft work` drives `claude -p` and is Claude Code only. For Codex, loop by hand: `codex exec "Use the feature-tree skill. Do the next ready todo from ft next, then stop."` and rerun. Check `ft status` between runs.

Everything else is identical: `ft status`, `ft next`, `ft ask`, `ft reflect`, `ft lint`.

## 6. The daily loop

Human:

1. `ft status` (or open the graph). Read NEEDS YOU.
2. Answer questions in the drawer or the markdown. For an agent-assumed answer (`[~]`), confirm it (`[x]`) or reopen it.
3. Mark any todo that needs a person with `{hitl}`. Add ideas as `- [ ] (P?) text`; the agent assigns priority.
4. Let the agent work. `ft pause` to stop everything.
5. When back: `ft digest`.

Agent:

1. `ft status`, then `ft next`.
2. Build, test, tick `[x]`.
3. `ft reflect NODE --todo "<text>" --note "<what now exists>"` moves finished work into Implemented and Archived. `--question Qn` does the same for a confirmed question.
4. `ft index && ft lint`.

Commands cheat sheet:

| Command | Use |
|---|---|
| `ft status` | briefing, run first and last |
| `ft next` / `ft todos` | what to do next / all todos by priority |
| `ft questions` | open and agent-assumed questions |
| `ft ask NODE "q"` | log a question |
| `ft assume NODE Qn` | unattended: take the recommended option, flagged unconfirmed |
| `ft reflect --check` | list finished items not yet written up |
| `ft new` / `rename` / `move` / `delete` | reshape the tree |
| `ft index` / `ft lint` | regenerate links and status / validate |
| `ft view` | build the standalone viewer |
| `ft pause` / `resume` | human kill switch |

## 7. Troubleshooting

- **`ft: command not found`** — use the alias from section 1 or call `python3 .../skill/scripts/ft.py` directly.
- **Viewer is blank or shows old data** — run `ft view` and reload. In the live mode, pick the `features/` folder, not its parent.
- **No "change folder" button** — the browser lacks the folder-picker API (Firefox, Safari, VS Code's Simple Browser). Use Chrome or Edge. The VS Code extension has no picker by design; it edits the open workspace.
- **Extension missing or stale in VS Code** — it needs `features/SCHEMA.md` in the workspace. Reinstall the `.vsix`, then Developer: Reload Window.
- **`ft lint` errors** — read the message; most are fixed by `ft index`. A node marked `done` needs passing tests, `last_verified`, and no open todos or questions.
- **Agent keeps stopping on a Stop hook** — it has finished items not written up. Run `ft reflect --check` and do the listed `ft reflect` calls.
- **`ft work` says AGENT IDLE or exits 5** — idle means only human items remain; exit 5 means the tree is paused. Run `ft resume`.
