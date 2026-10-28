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
When an agent works without a human and a todo blocks on a question that has a recommended default, stalling wastes the whole run. `ft assume NODE Qn [--option N]` answers the question with the recommended option (or the Nth), marks it agent-answered `[~]` with an explicit unconfirmed note, and removes the `{blocked}` marker so work continues. The human reviews assumptions from `ft status` (they show under confirm) and can reopen any of them. Questions without options are never assumed: those need research or the human.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.AutonomyTests` (assume tests) passes.

## Todos

## Questions


## Implemented
An agent working alone can answer a question that has a recommended default instead of stalling. The answer is recorded as an unconfirmed agent decision, work that waited on it resumes, and the human reviews or reverses it later. Rule of thumb: only safe, reversible choices may be assumed; irreversible, costly or security-relevant ones stay open for the human.

## Facts & Details

## Citations

## Archived
- [x] (P1) `ft assume` answers an optioned open question as `[~]`, unblocks its todos, refuses option-less or closed questions
- [x] (P2) document in SKILL.md when an unattended agent may assume vs must leave a question for the human

## Children
