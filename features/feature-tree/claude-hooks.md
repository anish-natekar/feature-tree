---
name: claude-hooks
status: done
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft.HookTests
last_verified: 2026-10-28
---
# claude-hooks

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Automatic guard rails for an AI coding agent working on a plan, so correctness does not depend on the agent remembering the rules. Three guards exist: one rejects edits that leave a plan node invalid, one refuses to let the agent finish while finished work has not been written back into the plan, and one briefs every fresh session on the current state.

## Methodology
Each guard is triggered by an event in the agent's lifecycle and talks back through a fixed contract: feedback that must be acted on is sent as an error with a blocking result, while the briefing is plain output that becomes session context.

Edit guard, after every file edit:
1. Ignore the edit unless the file is a markdown file inside the plan folder.
2. Re-check the whole plan, not just the touched node, because one edit can break links elsewhere.
3. If any node is now invalid, send back the list of errors (node path plus message) and ask the agent to fix them. Warnings never block.

Stop guard, when the agent tries to end its turn:
1. Collect problems: a confirmed todo or question not yet archived (the message names the node and the exact write-back step), a todo with no priority, and a node marked done that still has open todos.
2. If there are problems, refuse the stop and list each one.
3. Step aside, so the agent can never be trapped, in two cases: the agent was already refused once for this stop attempt, or a human has paused the plan, in which case it may stop cleanly with no nagging.

Session briefing, when a session starts: print the plan status, a digest of what changed in the last day, and the next todo to work on.

The unreflected-work check is the same one the manual write-back step uses, so the guard and the manual step cannot disagree. The guards keep no data of their own; they read the plan and the pause marker.

The stop guard blocks only once per attempt because a guard that could block forever would be worse than the forgotten write-back it prevents.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.HookTests -v` passes (3 tests: lint-blocks-on-error, stop-hook-checkpoint, context-hook).

## Todos

## Questions

## Implemented
- Edit guard that validates the whole plan after each markdown edit in the plan folder.
- Stop guard that lists unarchived confirmed items, unprioritised todos and done nodes with open todos.
- Session briefing with status, recent changes and the next todo.
- Installation through a small settings snippet wiring each guard to its event, documented in a readme beside the hook script.

## Facts & Details
- Output contract: feedback to the agent is an error with a blocking result; the briefing is plain output.
- Decision: the stop guard blocks at most once per stop attempt.
- Limitation: hooks cannot enforce time limits on a todo and cannot trigger context compaction; those stay with the work loop and the human.

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P3) document the hook install steps (wiring `ft_hook.py` into `settings.json`) in a README, not just inline in `SKILL.md`

## Children
