---
name: claude-hooks
status: done
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft.HookTests
last_verified: 2026-10-28
---
# claude-hooks

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Automatic guard rails for an AI coding agent working on a plan, so correctness does not depend on the agent remembering the rules. Three guards exist. One rejects any edit that leaves a plan node invalid. One refuses to let the agent finish its turn while finished work has not been written back into the plan. One gives every fresh session a short briefing so it starts from the current state instead of from memory. The unreflected-work check behind the second guard is the same one the manual reflect step uses, so the guard and the manual step never disagree.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.HookTests -v` passes (3 tests: lint-blocks-on-error, stop-hook-checkpoint, context-hook).

## Todos

## Questions

## Implemented
- Edit guard: runs after every file edit the agent makes. It only reacts to markdown files inside the plan folder; edits anywhere else are ignored. It re-checks the whole plan and, if any node is now invalid, sends the list of errors (node path plus message) back to the agent and asks it to fix them before continuing. Warnings never block.
- Stop guard: runs when the agent tries to end its turn. It collects problems and, if there are any, refuses the stop and lists each one. The problems are: a confirmed todo or question that is not yet archived (the message names the node and the exact reflect step to run), a todo with no priority, and a node marked done that still has open todos.
- The stop guard steps aside in two cases so it can never trap the agent. If the agent already tried to stop once and was refused, the next stop goes through. If a human has paused the plan, the agent may stop cleanly with no nagging.
- Session briefing: when a session starts, the guard prints the plan status, a digest of what changed in the last day, and the next todo to work on. This is injected as context for the agent.
- Installation is a small settings snippet that wires each guard to its event; the steps live in a readme beside the hook script.

## Facts & Details
- Output contract: feedback to the agent goes out as an error message with a blocking result; the briefing goes out as plain output that becomes session context.
- Decision: the stop guard blocks only once per stop attempt. A guard that could block forever would be worse than the forgotten write-back it prevents.
- Limitation: hooks cannot enforce time limits on a todo and cannot trigger context compaction; those stay with the work loop and the human.

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P3) document the hook install steps (wiring `ft_hook.py` into `settings.json`) in a README, not just inline in `SKILL.md`

## Children
