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
`python3 -m unittest skill.tests.test_ft -v` passes (16 tests: WorkTests, MarkerTests, HookTests, QuestionOptionTests).

## Todos
- [ ] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run
- [ ] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [ ] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions
- [ ] (P2) add `rollup_progress()` (done/total todos across a node + its descendants) and show it in `ft tree` output
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree
- [ ] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`
- [ ] (P3) lint check for degenerate MCQ options (duplicate option text, or a question with only one `- O:` line)

## Questions

## Implemented
- Node schema parser/serializer: frontmatter + fixed section order (Abstract, Acceptance Tests, Todos, Questions, Implemented, Citations, Children), byte-identical round-trip on unedited files.
- `ft lint`: schema errors, size warnings (`WARN_MAX=600` words), missing/stale section index ("Jump:" line, fixable via `ft index`), broken parent/child links, bad `{limit}`/`{tle}` syntax.
- `ft work` headless driver: `WORK_PROMPTS`, `run_limited()` process-group kill on timeout, `mark_tle()`, auto-split of nodes over `MAX_OPEN_TODOS=12`.
- Multiple-choice questions: `ft ask <node> "text" --option "..." --option "..."` (repeatable), written as `- O:` sub-lines under the question; first option = recommended, "Other" always implicit — never hand-written to disk.
- `ft_hook.py`: lint-on-write, stop-hook checkpoint (blocks finishing with unchecked-but-done todos not yet moved to Implemented), session-start context injection.

## Facts & Details

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)
- [features/SCHEMA.md](../SCHEMA.md)

## Archived

## Children
