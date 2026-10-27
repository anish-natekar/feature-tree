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
The `skill/scripts/ft.py` command-line driver: the single source of truth for parsing, linting, and mutating feature nodes (`ft new/lint/tree/todos/ask/index/view`), plus the headless `ft work` loop that drives Claude Code against the tree's own todos (triage, per-task time limits via `{limit}`/`{tle}`, consecutive-TLE abort, auto-split of oversized nodes) and the `ft_hook.py` PostToolUse/Stop/SessionStart hooks. It exists so every other surface (VS Code extension, standalone viewer, a future agent) can trust one parser/serializer instead of each re-implementing the markdown schema.

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
- `ft_hook.py`: lint-on-write, stop-hook checkpoint (blocks finishing with unchecked-but-done todos not yet moved to Implemented), session-start context injection.
Added `{blocked-by: node-name}` todo marker, researched from Matt Pocock's Wayfinder skill: cross-branch dependency gate independent of tree position. `pick_next`/`ft next` and `ft todos` exclude the todo from the frontier while the target node's own `status` isn't `done`; `ft todos` renders it with a `⛔ blocked by <name>` suffix instead of hiding it. `ft lint` warns if the target node doesn't exist.
Added `{hitl}` flag marker (binary tag, not Wayfinder's full research/prototype/grilling/task typing) plus `--afk-only` on `ft next` and `ft todos`, so an unattended/looped session filters HITL-tagged todos out of the frontier.
Added `rollup_progress()` (done/total todo count across a node and its descendants, purely derived from checkboxes) and wired it into `ft tree`'s `[NN%]` display, researched from Linear/Obsidian-plugin progress-rollup conventions. A node with no todos anywhere in its subtree shows no percentage.
Added a non-error `ft lint` warning for an Abstract still starting with `DRAFT:`, nudging that the node may have been created by `ft init` before its scope was actually sharp (fog-of-war discipline).

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
