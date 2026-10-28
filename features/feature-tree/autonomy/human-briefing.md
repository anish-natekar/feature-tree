---
name: human-briefing
status: done
parent: autonomy
tests: python3 -m unittest skill.tests.test_ft.AutonomyTests
last_verified: 2026-10-29
---
# human-briefing

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
One command a human runs to take control of an agent-built project, in a single screen. The goal is that nothing hides: if an agent is stuck or guessed, it is listed here, ranked by urgency.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (status tests) passes.

## Todos

## Questions


## Implemented
- Optional scope: restrict to one node and its descendants.
- Pause line: if work is paused, the first line says so with the reason and how to resume.
- Progress: todos done out of total with a percentage, plus counts of nodes by status. Archived todos count as done so the figure does not shrink as items are reflected.
- Needs you, sorted most urgent first: lint errors and open questions that block a todo (with how many); other open questions; todos only a human can do; agent-answered questions to confirm; and timed-out todos to split. Open questions show the option the agent would pick. An empty list says nothing.
- Agent can do alone: the count of ready todos (open, not blocked, not human-only, with a priority) and the single next pick under unattended rules, or a note that nothing is ready. Unreflected items appear as housekeeping.
- Idle verdict: when the agent has nothing to do and nothing needs reflecting, it prints that stopping is correct and what remains is human work, so goal-driven or looping sessions can end cleanly.
- Every new session starts from this briefing instead of a raw tree dump.

## Facts & Details
- It never changes anything.
- Ranking by blocked-todo count puts the decision that unlocks the most work first.
- The idle verdict exists because agents otherwise loop or invent work when only human items remain.

## Citations

## Archived
- [x] (P1) `ft status` prints PROGRESS, NEEDS YOU, AGENT CAN DO ALONE and honours `--under`
- [x] (P2) have the SessionStart hook print `ft status` instead of tree+next so every fresh session starts from the briefing

## Children
