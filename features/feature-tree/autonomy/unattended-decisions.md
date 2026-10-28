---
name: unattended-decisions
status: done
parent: autonomy
tests: python3 -m unittest skill.tests.test_ft.AutonomyTests
last_verified: 2026-10-29
---
# unattended-decisions

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
When an agent works without a human and a todo waits on a question that has a recommended default, stalling wastes the whole run. This lets the agent adopt the default, clearly flagged, so work continues and the human reviews later.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (assume tests) passes.

## Todos

## Questions


## Implemented
- Input: a node, a question number, and optionally which option to take (default: the first, the recommended one).
- Effect: the question becomes agent-answered rather than closed, gets an answer line recording the chosen option with a note that it was assumed while unattended and is unconfirmed, and any todos tagged as waiting on that question are released.
- Refusals, each with a message and no change: unknown node or question; question not currently open; question with no options (those need research or a human); option number out of range.
- Review: assumed answers appear in the briefing's needs-you list as items to confirm, and the daily digest lists them as agent decisions. A human confirms by closing the question or reverses it by reopening.
- Guidance for agents: only choices that are safe and reversible may be assumed. Irreversible, costly or security-relevant ones stay open for the human.

## Facts & Details
- The safety line is policy, not enforced by the tool: the tool cannot judge risk, so the skill instructs agents and the human audit trail catches mistakes.
- Using an unconfirmed state instead of closing keeps the decision visible instead of silently settled.
- Work built on an assumption is not rolled back automatically when a human reopens it; the human decides what to redo.

## Citations

## Archived
- [x] (P1) `ft assume` answers an optioned open question as `[~]`, unblocks its todos, refuses option-less or closed questions
- [x] (P2) document in SKILL.md when an unattended agent may assume vs must leave a question for the human

## Children
