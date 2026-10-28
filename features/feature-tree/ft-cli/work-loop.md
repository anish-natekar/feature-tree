---
name: work-loop
status: in-progress
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
- [ ] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree

## Questions

## Implemented
- `ft work` headless driver: `WORK_PROMPTS`, `run_limited()` process-group kill on timeout, `mark_tle()`, auto-split of nodes over `MAX_OPEN_TODOS=12`.
- `{limit}`/`{tle}` inline todo markers with `ft lint` syntax validation.

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)

## Archived

## Children
