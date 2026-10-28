---
name: init
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.InitTests
last_verified: 2026-10-28
---
# init

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`ft init [path]`: bootstraps a rough-draft tree from an existing codebase (README/manifest/top-level dirs); refuses to run if `features/` is already non-empty. Each generated child gets a `DRAFT:`-prefixed placeholder Abstract, and `ft lint` warns when an Abstract still starts with `DRAFT:` — a fog-of-war nudge that the node's scope hasn't actually been sharpened yet.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.InitTests -v` passes (2 tests).

## Todos

## Questions

## Implemented
- `ft init [path]`: bootstraps a draft tree from an existing codebase; refuses if `features/` is already non-empty.
- `ft lint`: warns when an Abstract still starts with `DRAFT:` (a `ft init` leftover — fog-of-war nudge).

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`

## Children
