---
name: work-loop
status: planned
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests
last_verified: 2026-10-28
---
# work-loop

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The headless `ft work` driver: runs `claude -p` once per todo until `ft next` returns NONE, triaging unassigned-priority todos first. Per-task time budgets via inline `{limit: Ns}` markers, with `{tle}` recorded on timeout (process-group kill via `run_limited()`), a consecutive-TLE abort guard, and auto-split of nodes once they exceed `MAX_OPEN_TODOS`.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests -v` passes (10 tests: work-loop triage/limit/abort behavior, `{limit}`/`{tle}` marker parsing and lint).

## Todos
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree

## Questions

## Implemented
- `ft work` headless driver: `WORK_PROMPTS`, `run_limited()` process-group kill on timeout, `mark_tle()`, auto-split of nodes over `MAX_OPEN_TODOS=12`.
- `{limit}`/`{tle}` inline todo markers with `ft lint` syntax validation.
Verified with a real headless run (haiku, throwaway project): `--permission-mode acceptEdits --allowedTools "Bash(python3 skill/scripts/ft.py:*)" "Bash(test:*)" "Bash(grep:*)"` completed a todo; add Bash(<test cmd>:*) per node tests. ft work now also runs a Reflect step so checked items never pile up.

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)

## Archived
- [x] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run

## Children
