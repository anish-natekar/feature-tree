---
name: reflect
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.ReflectTests
last_verified: 2026-10-28
---
# reflect

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The archive-and-distill stage of the work cycle. When a todo or question is confirmed done, reflect moves it unchanged into the Archived section and distills a one-line prose note into Implemented (for todos) or Facts & Details (for questions), so the node's current state reads as a summary of what is true rather than a pile of finished checkboxes. A check mode reports anything confirmed but not yet reflected. The stop guard and the planning-mode gate both rely on that same check, so the two can never drift apart.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.ReflectTests -v` passes (5 tests).

## Todos

## Questions

## Implemented
- Reflect command: archives a confirmed todo or question verbatim and distills a note into Implemented or Facts & Details.
- Check mode, shared with the stop guard and the planning-mode gate, listing confirmed items that still need reflecting.

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
