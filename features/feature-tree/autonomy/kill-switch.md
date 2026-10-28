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
A human must be able to stop autonomous work immediately, without knowing process ids or editing anything. One command pauses, another resumes.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (pause tests) passes.

## Todos

## Questions


## Implemented
- Pausing: takes an optional reason, defaulting to a generic one, and stores it in a small marker file inside the plan folder. Resuming deletes the marker; resuming when not paused is harmless.
- Effects while paused: the next-work choice reports the pause and the reason instead of a todo, so skill-driven sessions stop picking work; the headless driver refuses to start another step and exits with a dedicated code; the end-of-turn guard stops nagging about unfinished checkpoints so the agent can end cleanly; the briefing opens with a pause line; the viewer shows a banner.
- A step already running is not killed; the pause takes effect before the next step begins.
- Questions, listing and editing still work, so a human can keep planning while paused.

## Facts & Details
- A plain file was chosen over a flag in a process or database: it is versioned and visible with the plan, can be set by hand or from another tool, and survives restarts.
- The reason text is free-form and shown to anyone who looks, so agents know why.
- The pause is global to a plan, not per node.

## Citations

## Archived
- [x] (P1) `ft pause`/`ft resume` gate `ft next` and `ft work`, and show in `ft status`
- [x] (P3) make the Stop/PostToolUse hooks also respect `.paused`

## Children
