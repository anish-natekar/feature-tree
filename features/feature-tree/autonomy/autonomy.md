---
name: autonomy
status: done
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft.AutonomyTests
last_verified: 2026-10-29
---
# autonomy

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Goal: make the tree a self-managing control plane. A human glances at one briefing to see progress and the few things only they can decide, then walks away; agents keep working through everything else without being around, and every decision they made alone stays visible, reviewable and reversible. The tree on disk is the only shared state: the human steers by answering questions, confirming agent assumptions, tagging work HITL, and pausing; the agent steers by `ft next --afk-only`, `ft assume` and `ft ask`. This node groups the capabilities that serve that loop; each child owns one piece.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` passes, and `ft status` on this repo prints a briefing whose NEEDS YOU list matches `ft questions --open`.

## Todos

## Questions


## Implemented
AutonomyTests e2e: assume unblocks a gated todo, ft work finishes the rest with the fake claude, ft status then lists only the assumption to confirm; pause stops ft work (exit 5).

## Facts & Details

## Citations

## Archived
- [x] (P2) run `ft work` unattended end to end on a throwaway sample tree and confirm it finishes, pauses on `ft pause`, and leaves a clean `ft status` handoff

## Children
- [[autonomy-in-ui]] (done)
- [[human-briefing]] (done)
- [[kill-switch]] (done)
- [[unattended-decisions]] (done)
