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
The headless driver that works through the plan with no human present. It repeatedly starts a fresh agent session for one step, then checks the plan on disk to decide what to do next, until nothing is left. The plan files, not any session memory, carry all the state.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.WorkTests skill.tests.test_ft.MarkerTests -v` passes (10 tests: work-loop triage/limit/abort behavior, `{limit}`/`{tle}` marker parsing and lint).

## Todos
- [ ] (P2) tune default `--task-limit`/`--max-tle` once there's real usage data from running `ft work` on a non-sample tree {hitl}

## Questions

## Implemented
- Step choice, in priority order: split an oversized node (too long or more than twelve open todos), reflect confirmed items, triage todos with no priority, do the next ready todo, research open questions once. When none applies the run ends and prints any open questions for the human.
- Preconditions each round: the pause switch must be off (otherwise it stops with its own exit code) and the plan must have no lint errors.
- Time budget: each todo has a default limit, overridable per todo with a duration such as twenty minutes. Other step kinds use a longer shared limit. On expiry the session's entire process group is killed, and a work todo is tagged as timed out so it is skipped from then on. A timed-out non-work step stops the run.
- Stopping conditions: step cap reached (default ten), several timeouts in a row (default three), the same todo still next after a full pass, no plan change after a work step, or the agent exiting with an error. Each has a distinct exit code.
- Logs of each step are kept; the last lines are echoed. A dry run shows what would run.
- The driver never bypasses permissions on its own; the caller supplies them.

## Facts & Details
- One fresh session per step keeps context small and makes every step restartable.
- Progress is detected by hashing the plan files, which catches an agent that claims success but changed nothing.
- Defaults are placeholders awaiting real usage data.
- A real run on a throwaway project with the small model completed a todo once edits and a narrow set of commands were permitted; each node's own test command must be permitted too.

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)

## Archived
- [x] (P1) `ft work`'s real `claude` invocation needs `--allowedTools` tuned so Bash commands (e.g. running a node's own test suite) aren't denied under `acceptEdits` mode during a real headless run

## Children
