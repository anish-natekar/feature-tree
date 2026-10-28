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
The node schema itself: frontmatter + the fixed 9-section order (Abstract, Acceptance Tests, Todos, Questions, Implemented, Facts & Details, Citations, Archived, Children), parsed and serialized byte-identically by `skill/scripts/ft.py`. `ft lint`'s foundational checks live here too — schema/section-order errors, size warnings (`WARN_MAX=600` words), missing/stale section index ("Jump:" line, fixable via `ft index`), and broken parent/child or wikilink references. Todos are 3-state (`[ ]`/`[~]`/`[x]`), mirroring Questions' convention.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.TodoStateTests -v` passes (2 tests: 3-state checkbox parse/format round-trip).

## Todos

## Questions

## Implemented
- Node schema parser/serializer: frontmatter + fixed 9-section order (Abstract, Acceptance Tests, Todos, Questions, Implemented, Facts & Details, Citations, Archived, Children), byte-identical round-trip on unedited files.
- `ft lint`: schema/section-order errors, size warnings (`WARN_MAX=600` words), missing/stale section index ("Jump:" line, fixable via `ft index`), broken parent/child links.
- Todos widen to 3-state checkbox `[ ]`/`[~]`/`[x]`, mirroring Questions' 3-state convention; `ft next` prefers in-progress over higher-priority not-started.
LintBaseTests: clean pass, section order, short/oversize nodes, stale Jump, broken wikilink, missing parent.

## Facts & Details

## Citations
- [skill/scripts/ft.py](../../../skill/scripts/ft.py)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add a dedicated test class for `ft lint`'s base rules (schema-order errors, size warnings, stale Jump line, broken parent/child/wikilink references) — currently only exercised incidentally through other test classes' fixtures, not tested directly

## Children
