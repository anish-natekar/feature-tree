---
name: schema
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.TodoStateTests
last_verified: 2026-10-28
---
# schema

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The node format itself: frontmatter plus nine sections in a fixed order (Abstract, Acceptance Tests, Todos, Questions, Implemented, Facts & Details, Citations, Archived, Children). The tool reads and writes nodes so that an unedited file comes back byte-for-byte identical, which keeps diffs clean. The foundational lint checks live here too: schema and section-order errors, size warnings above 600 words, a missing or stale jump line (fixable by re-indexing), and broken parent, child or wikilink references. Todos have three states (not started, in progress, done), mirroring the convention already used for questions.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.TodoStateTests -v` passes (2 tests: 3-state checkbox parse/format round-trip).

## Todos

## Questions

## Implemented
- Node parser and serializer with the fixed section order and a byte-identical round-trip on unedited files.
- Lint covering schema and section-order errors, oversize warnings, missing or stale jump lines, and broken parent, child and wikilink references.
- Three-state todos; the next-work command prefers an in-progress todo over a higher-priority one not yet started.
- A dedicated test class now exercises these base lint rules directly: clean pass, section order, short and oversize nodes, stale jump line, broken wikilink and missing parent.

## Facts & Details

## Citations
- [skill/scripts/ft.py](../../../skill/scripts/ft.py)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add a dedicated test class for `ft lint`'s base rules (schema-order errors, size warnings, stale Jump line, broken parent/child/wikilink references) — currently only exercised incidentally through other test classes' fixtures, not tested directly

## Children
