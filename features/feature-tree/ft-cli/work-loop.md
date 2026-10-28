---
name: work-loop
status: planned
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests
last_verified: 2026-10-28
---
# work-loop

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The headless driver that works through the plan with no human present. It repeatedly starts a fresh agent session for one step, then checks the plan on disk to decide what to do next, until nothing is left. The plan files, not any session memory, carry all the state.

## Methodology
Each round the driver first checks two preconditions: the pause switch must be off (otherwise it stops with its own exit code) and the plan must have no lint errors.

It then picks one step, in this priority order:
1. Split an oversized node (too long, or more than twelve open todos).
2. Reflect confirmed items.
3. Triage todos that have no priority.
4. Do the next ready todo.
5. Research open questions, once.
When none applies the run ends and prints any open questions for the human.

A fresh session handles each step, which keeps context small and makes every step restartable. Afterward the driver fingerprints the plan files to detect progress, which catches an agent that claims success but changed nothing.

Time budget: each todo has a default limit, overridable per todo with a duration such as twenty minutes; other step kinds share a longer limit. On expiry the session's entire process group is killed. A work todo is then tagged as timed out so it is skipped from then on, while a timed-out step of any other kind stops the run.

Stopping conditions, each with a distinct exit code: the step cap is reached (default ten); several timeouts in a row (default three); the same todo is still next after a full pass; no plan change after a work step; or the agent exits with an error.

The log of each step is kept and the last lines echoed. A dry run shows what would execute without running it. The driver never bypasses permissions on its own; the caller supplies them, and each node's own test command must be permitted too.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests -v` passes (10 tests: work-loop triage/limit/abort behavior, `{limit}`/`{tle}` marker parsing and lint).

## Todos
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree {hitl}

## Questions

## Implemented
- Step selection, preconditions, time budgets and stop conditions.
- Per-step logs and a dry run.
- Timeout tagging of stuck todos.

## Facts & Details
- Defaults for the time limit and timeout cap are placeholders awaiting real usage data.
- A real run on a throwaway project with the small model completed a todo once edits and a narrow set of commands were permitted.

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)

## Archived
- [x] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run

## Children
