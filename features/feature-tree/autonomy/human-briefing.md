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
`ft status` is the one command a human runs to take control of an agent-built project. One screen: PROGRESS (todos done, nodes by status), NEEDS YOU (open questions ranked by how many todos they block with the agent's recommended option shown, agent-answered questions to confirm, HITL todos only a human can do, TLE todos to split, lint errors), and AGENT CAN DO ALONE (ready count plus the next autonomous pick). The goal is that nothing hides: if the agent is stuck or guessed, it is listed here, ranked by urgency.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (status tests) passes.

## Todos

## Questions


## Implemented
`ft status` implemented in ft.py (cmd_status); ranks open questions by blocked todos, shows recommended option, surfaces HITL/TLE/lint errors.
SessionStart hook now prints `ft status` then `ft next`.

## Facts & Details

## Citations

## Archived
- [x] (P1) `ft status` prints PROGRESS, NEEDS YOU, AGENT CAN DO ALONE and honours `--under`
- [x] (P2) have the SessionStart hook print `ft status` instead of tree+next so every fresh session starts from the briefing

## Children
