---
name: kill-switch
status: done
parent: autonomy
tests: python3 -m unittest skill.tests.test_ft.AutonomyTests
last_verified: 2026-10-29
---
# kill-switch

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A human must be able to stop autonomous work immediately, without knowing process ids or editing anything. One command pauses, another resumes.

## Methodology
Pausing takes an optional free-form reason, with a generic default, and stores it in a small marker file inside the plan folder. Resuming deletes the marker; resuming when not paused is harmless. The pause is global to a plan, not per node.

Everything that does autonomous work checks for the marker:
- The next-work choice reports the pause and the reason instead of a todo, so skill-driven sessions stop picking work.
- The headless driver refuses to start another step and exits with a dedicated code.
- The end-of-turn guard stops nagging about unfinished checkpoints, so the agent can end its turn cleanly.
- The briefing opens with a pause line and the viewer shows a banner, so anyone looking learns why.

A step already running is not killed; the pause takes effect before the next step begins. Questions, listing and editing still work while paused, so a human can keep planning.

Why a plain file rather than a flag held in a process or database: it is versioned and visible alongside the plan, can be set by hand or from another tool, and survives restarts. The reason text is visible to anyone who looks, so agents and humans know why work stopped.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (pause tests) passes.

## Todos

## Questions


## Implemented
- Pause with optional reason, resume, and effects on every autonomous path.
- Viewer banner.

## Facts & Details
- Pause is cooperative: it does not interrupt a step already in flight.
- Scope is the whole plan.

## Citations

## Archived
- [x] (P1) `ft pause`/`ft resume` gate `ft next` and `ft work`, and show in `ft status`
- [x] (P3) make the Stop/PostToolUse hooks also respect `.paused`

## Children
