---
name: kill-switch
status: done
parent: autonomy
tests: python3 -m unittest skill.tests.test_ft.AutonomyTests
last_verified: 2026-10-29
---
# kill-switch

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A human must be able to stop autonomous work instantly and without knowing process ids. `ft pause [reason]` writes `features/.paused`; `ft next` then prints PAUSED instead of a todo, so skill-driven sessions stop picking work, and `ft work` refuses to start another step (exit 5). `ft resume` clears it. The pause is a plain file so it also versions, shows in `ft status`, and can be set by hand or from another tool.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (pause tests) passes.

## Todos

## Questions


## Implemented
A human can pause all unattended work with one command and resume it later. While paused, agents are told not to pick up work, the automatic runner refuses to start another step, and the end-of-turn checks stop nagging. The pause is visible in the briefing and in the viewer.

## Facts & Details

## Citations

## Archived
- [x] (P1) `ft pause`/`ft resume` gate `ft next` and `ft work`, and show in `ft status`
- [x] (P3) make the Stop/PostToolUse hooks also respect `.paused`

## Children
