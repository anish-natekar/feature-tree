---
name: ft-cli
status: done
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft
last_verified: 2026-10-28
---
# ft-cli

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The `skill/scripts/ft.py` command-line driver: the single source of truth for parsing, linting, and mutating feature nodes. One parser/serializer every surface (VS Code extension, standalone viewer, a future agent) can trust instead of each re-implementing the schema. See the children below for each capability's own detail: [[schema]], [[work-loop]], [[questions]], [[cross-branch-deps]], [[progress-rollup]], [[reflect]], [[structural-editing]], [[init]].

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft -v` passes (38 tests, aggregate across all children's test classes).

## Todos

## Questions

## Implemented

## Facts & Details

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
- [[cross-branch-deps]] (done)
- [[init]] (done)
- [[progress-rollup]] (done)
- [[questions]] (planned)
- [[reflect]] (done)
- [[schema]] (planned)
- [[structural-editing]] (done)
- [[work-loop]] (planned)
