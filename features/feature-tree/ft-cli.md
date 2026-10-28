---
name: ft-cli
status: in-progress
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft
last_verified: 2026-10-28
---
# ft-cli

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The `skill/scripts/ft.py` command-line driver: the single source of truth for parsing, linting, and mutating feature nodes (`ft new/lint/tree/todos/ask/index/view`, structural edits `delete/rename/move`, bootstrapping `init`, archiving `reflect`), plus the headless `ft work` loop (triage, per-task `{limit}`/`{tle}` time budgets, auto-split of oversized nodes) and the `ft_hook.py` hooks. One parser/serializer every surface (VS Code extension, standalone viewer, a future agent) can trust instead of each re-implementing the schema.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft -v` passes (38 tests: WorkTests, MarkerTests, HookTests, QuestionOptionTests, DependencyTests, RollupTests, LintPhilosophyTests, among others).

## Todos
- [ ] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree
- [ ] (P3) lint check for degenerate MCQ options (duplicate option text, or a question with only one `- O:` line)

## Questions

## Implemented
- Node schema parser/serializer: frontmatter + fixed section order (Abstract, Acceptance Tests, Todos, Questions, Implemented, Citations, Children), byte-identical round-trip on unedited files.
- `ft lint`: schema errors, size warnings (`WARN_MAX=600` words), missing/stale section index ("Jump:" line, fixable via `ft index`), broken parent/child links, bad `{limit}`/`{tle}` syntax.
- `ft work` headless driver: `WORK_PROMPTS`, `run_limited()` process-group kill on timeout, `mark_tle()`, auto-split of nodes over `MAX_OPEN_TODOS=12`.
- Multiple-choice questions: `ft ask <node> "text" --option "..." --option "..."` (repeatable), written as `- O:` sub-lines under the question; first option = recommended, "Other" always implicit — never hand-written to disk.
- `ft_hook.py`: lint-on-write, stop-hook checkpoint (blocks finishing on unreflected `[x]` todos/questions, `P?` priorities, or a `done` node with open todos), session-start context injection.
- Structural editing (filesystem operations, not just frontmatter): `ft delete <name> [--subtree] [--yes]` (reparents direct children by default, dry-run unless `--yes`), `ft rename <old> <new>` (updates `parent:` + wikilinks tree-wide), `ft move <name> <new-parent|->`.
- `ft init [path]`: bootstraps a draft tree from an existing codebase; refuses if `features/` is already non-empty.
- `ft reflect`: archives a confirmed `[x]` todo/question into `## Archived`, distills a note into `## Implemented`/`## Facts & Details`; `--check` backs the Stop hook and the Plan-mode gate.
- `{blocked-by: node-name}` (Wayfinder-inspired cross-branch dependency gate): excluded from `ft next`/`ft todos` until the target node's `status` is `done`, regardless of tree position; `ft todos` shows `⛔ blocked by <name>`; `ft lint` warns on a dangling target.
- `{hitl}` flag + `--afk-only` on `ft next`/`ft todos`: filters human-only todos out of unattended/looped runs.
- `rollup_progress()`: done/total todos across a node + descendants, shown as `ft tree`'s `[NN%]`; no badge when a subtree has no todos.
- `ft lint`: warns when an Abstract still starts with `DRAFT:` (a `ft init` leftover — fog-of-war nudge).

## Facts & Details

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [x] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions
- [x] (P2) add `rollup_progress()` (done/total todos across a node + its descendants) and show it in `ft tree` output
- [x] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`

## Children
