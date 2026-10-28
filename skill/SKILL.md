---
name: feature-tree
description: Hierarchical feature planning kept as markdown nodes under features/. Use when planning a project, scoping features, picking the next todo, answering or logging open questions, or updating docs after a feature passes its tests. Planning never edits project code.
---

# Feature Tree

Plan lives in `features/` as markdown. Format rules: `features/SCHEMA.md`. Helper: `python3 skill/scripts/ft.py` (stdlib only; `--root` to change dir).

## Commands

- `ft tree` — hierarchy with status and open-todo counts.
- `ft next [--under NODE]` — highest priority todo that is not blocked on an open question. Prints `NONE` when nothing is workable.
- `ft todos [--under NODE] [--ready] [--unassigned] [--all]` — todos by priority; blocked ones are marked ⛔.
- `ft questions [--under NODE] [--open] [--all]` — open and agent-answered (`[~]`) questions; `--all` adds confirmed.
- `ft ask NODE "question"` — append a question, prints its id (Q1, Q2, …).
- `ft link NODE` — path + wikilink to cite. `ft refs NODE` — outgoing and incoming feature links.
- `ft new PARENT NAME` — scaffold node (`-` for root). `ft index` — regenerate `## Children`.
- `ft view [-o file]` — write a self-contained `features/viewer.html` (no server).
- `ft work [--under NODE] [--max N] [--task-limit SEC] [--max-tle N] [--dry-run] -- <claude args>` — headless driver: fresh `claude -p` per step (split big nodes, triage P?, one todo, research once). Each todo has a time budget; over it → killed, marked `{tle}`, skipped. Stops on lint errors, no progress, repeated TLEs, `--max`. It adds no permission flags itself: pass e.g. `--permission-mode acceptEdits` after `--`.
- `ft lint` — schema, size, links, question/todo consistency. Run after every edit; fix errors before moving on.
- `ft reflect --check [--under NODE]` — exit 1 if any confirmed `[x]` todo/question hasn't been archived+distilled yet. `ft reflect NODE --todo "<text>" --note "<prose>"` / `--question Qn --note "<prose>"` — do the archiving (see Reflect below).
- `ft delete NAME [--subtree] [--yes]`, `ft rename OLD NEW`, `ft move NAME NEW_PARENT|-` — structural edits to a mis-shaped tree. Dry-run by default for `delete`; pass `--yes` to apply.
- `ft init [PATH]` — bootstrap a rough-draft tree from an existing codebase (refuses if `features/` is already non-empty).

## Plan mode (build/extend the tree)

1. `ft reflect --check` first. If it exits 1, run Reflect (below) before planning anything new — don't plan on top of unreflected work.
2. Read `ft tree` and relevant nodes first.
3. Interview the user. Every question cites the node path and id (e.g. `features/robot-arm/gripper.md Q2`). If the user may be away, do not wait: log it with `ft ask` instead (see Questions) and keep going.
4. Use web search to pin down what a feature requires. Record sources in `## Citations`.
5. Create or edit nodes: Abstract states what and why; Acceptance Tests give a runnable command or `tests: manual` plus checklist; Todos carry `(P0-P3)`.
6. Keep nodes 80–600 words: split when big, merge when tiny. Run `ft index` then `ft lint`.
7. When a planned capability is a genuinely distinct piece of an existing subsystem node (its own test class, its own acceptance criteria, something you'd describe in one breath as "the X part"), scaffold it as a new child (`ft new <parent> <name>`) from the start — don't bundle it into the parent's `## Implemented` list and split later. Splitting after the fact is strictly worse: history is lost, and the tree reads shallower than what's actually built in the meantime. This is proactive, ahead of `ft lint`'s own size/children warn thresholds, not a reaction to them.
8. Do not touch project code in this mode.

## Work loop (implement mode)

Repeat until stopped by the user or nothing is left:

1. **Triage.** `ft todos --unassigned`: give every `(P?)` todo a priority P0–P3 (dependencies, abstracts), rewrite in place, one-line reason each.
2. **Pick.** `ft next`. Never choose a todo from memory, always from this command; the tree on disk is the plan. Unattended/looped session (no human watching): use `ft next --afk-only` instead — it skips `{hitl}`-tagged todos that need a live decision.
3. **Block instead of stalling.** If a todo cannot proceed because of a decision you cannot make safely:
   - `ft ask NODE "question"` (state the options you see and your recommendation in the text),
   - add `{blocked: Qn}` to the end of that todo,
   - go back to step 2. Do not wait for the human.
4. **Do it.** Implement, run the node's acceptance tests. Tests failing → keep the todo open (or `[~]` if partly done), add the blocker to its text or ask a question.
5. **Checkpoint (before anything else).** Only when tests pass: flip the todo's checkbox to `[x]` (do not delete it or write to Implemented yet — that's Reflect's job, batched later), set `status` and `last_verified`, update the parent's status, `ft index && ft lint`. After the checkpoint everything you know that matters is on disk.
6. **Context reset point.** The checkpoint is the safe moment to compact or clear context: the next step re-reads state with `ft next` / `ft questions`, so nothing is lost. If the user wants an unattended run, finish the todo, checkpoint, and stop with "checkpointed, safe to /compact"; do not rely on remembering anything not in the files. (A model cannot trigger `/compact` itself; the user, auto-compact, or a fresh session per todo does it.)
7. Back to step 2.

### When `ft next` prints NONE (everything left is blocked or done)

Research mode:
1. `ft questions --open`. For each, search the web and the repo for an answer.
2. Confident answer → set the question to `[~]` and add `  - A (agent): <one line>. Sources: [title](url)`; add the sources to the node's `## Citations`. Remove `{blocked: Qn}` from todos it unblocks. `ft lint`.
3. Not answerable alone (preference, business decision, missing access) → leave `[ ]`, append what you found and the options to the question text so the human can answer fast.
4. Go back to the Work loop; newly unblocked todos appear in `ft next`.
5. If still `NONE`: stop. Report the open questions grouped by node, with paths and ids, as the handoff for the human.

## Reflect

The Work loop's checkpoint only flips a todo to `[x]`; it doesn't archive or write it up. Reflect does that, batched, triggered by the Stop hook (which runs `ft reflect --check` and blocks if anything's outstanding) or by explicit request:

1. `ft reflect --check` (or `--under NODE`) — lists every confirmed `[x]` todo and question not yet archived.
2. For each: write a one-line (or short-paragraph) prose note — what got done / what was decided.
3. `ft reflect NODE --todo "<exact text>" --note "<prose>"` for a todo, or `ft reflect NODE --question Qn --note "<prose>"` for a question. This moves the raw line/block to `## Archived` and the note into `## Implemented` (todos) or `## Facts & Details` (questions).
4. `ft index && ft lint`. Repeat `ft reflect --check` until it exits 0.
5. Only then start a new plan (see Plan mode step 1).

## Safeguards

- **Time limit / TLE.** Todos may carry `{limit: 20m}`. `ft work` kills a step past its limit and writes `{tle: …}`. Never remove a `{tle}` yourself unless you first split the todo into smaller ones. Todo that hit TLE usually means too big: split it.
- **Size.** Over 600 words, 12 open todos, 8 children or depth 5 → split the node (`ft new`, move content, `ft index`, `ft lint`). Under 80 words → merge into parent.
- **Section index.** Each node has a `Jump:` line; never delete it, `ft index` restores it.
- **Hooks** (optional, `skill/hooks/settings.example.json`): lint after edits under `features/`, Stop gate that refuses to end while a confirmed `[x]` todo/question hasn't been reflected (`ft reflect`) or a `P?` remains, SessionStart context (`ft tree`, `ft next`). Hooks cannot enforce time limits (use `ft work`) or trigger `/compact`.

## Questions

- Where: `## Questions` in the node the question belongs to. Cite as `features/<path>.md Q1`.
- Agent answers are `[~]` and unconfirmed: you may build on them but say so in `## Implemented`; the human confirms or reopens in the viewer.
- `done` nodes cannot have open questions.
- Humans answer in the viewer (drawer or Questions tab of the floating box) or by editing the markdown.

## Unassigned priorities

Humans may log an issue as `- [ ] (P?) text`. Never leave `P?` after a planning or work pass.

## Linking

Reference another feature with `[[node-name]]` (optional `[[node-name|label]]`) instead of re-explaining it. External sources use `[text](https://url)`. `ft refs NODE` shows incoming and outgoing links.

## Rules

- Source of truth is the markdown; never keep plan state elsewhere.
- Never mark `done` without passing tests, no open todos, and no open questions.
- Wikilinks `[[name]]` keep the tree Obsidian-compatible; names are unique.
- Viewer: the VS Code extension and `features/viewer.html` read the same files; keep the format exact so it round-trips.
