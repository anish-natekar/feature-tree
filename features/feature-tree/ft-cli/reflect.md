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
`ft reflect`: the archive/distill stage. Moves a confirmed `[x]` todo or question verbatim into `## Archived`, and distills a one-line prose note into `## Implemented` (todos) or `## Facts & Details` (questions). `--check` backs both the Stop hook and the Plan-mode gate via the shared `unreflected()` helper, so the two never drift apart.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.ReflectTests -v` passes (5 tests).

## Todos

## Questions

## Implemented
- `ft reflect`: archives a confirmed `[x]` todo/question into `## Archived`, distills a note into `## Implemented`/`## Facts & Details`; `--check` backs the Stop hook and the Plan-mode gate.

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
