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
The headless driver that works through a tree unattended. It launches a fresh Claude run for each todo until the next-work command reports nothing left, triaging todos that have no priority first. Each task can carry a time budget; when a run exceeds it, the todo is marked as having timed out and its whole process group is killed. Several consecutive timeouts abort the loop, and nodes that accumulate too many open todos are split automatically. A reflect step runs after work so checked items never pile up.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests -v` passes (10 tests: work-loop triage/limit/abort behavior, `{limit}`/`{tle}` marker parsing and lint).

## Todos
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree {hitl}

## Questions

## Implemented
- Headless driver with per-step prompts, process-group kill on timeout, timeout marking and automatic splitting of nodes with more than twelve open todos.
- Time-limit and timed-out markers on todos, with lint validating their syntax.
- Verified with a real headless run on a throwaway project using the small Haiku model: allowing edits plus a narrow set of shell commands (the tree tool, test and grep) was enough to complete a todo. Each node's own test command must also be allowed for its tests to run.

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)

## Archived
- [x] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run

## Children
