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
The node format itself: a small metadata header followed by nine sections in fixed order: Abstract, Acceptance Tests, Todos, Questions, Implemented, Facts and Details, Citations, Archived, Children. One file per node, one place to look. Everything else in the tool reads and writes this shape, and the linter enforces it.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.TodoStateTests -v` passes (2 tests: 3-state checkbox parse/format round-trip).

## Todos

## Questions

## Implemented
- Metadata: name, status (planned, in progress or done), parent, a test command and a last-verified date. A node's name must be dashed lowercase and match its file; the parent must match where the file sits in the folder hierarchy, because nesting defines the tree.
- Round trip: reading and rewriting an untouched node produces byte-identical text, so diffs only show real changes.
- Todos: a checkbox with three states (not started, in progress, done), a priority from zero to three or unassigned, text, and optional trailing markers in braces. The next-work choice prefers an in-progress todo over a higher-priority one not yet started, so interrupted work finishes first.
- Questions: open, agent-answered or confirmed, optionally with options and an answer line.
- Status is derived: in progress if any todo is in progress; done only with no open todos or questions and both a test command and a verification date; otherwise planned. Indexing refreshes it and the section jump line.
- Lint errors: wrong section order, malformed todo or question lines, duplicate question numbers, impossible status, bad dates, broken parent or wikilink targets, size above the hard limit. Warnings: under 80 or over 600 words, missing tests, stale jump line or status, unassigned priorities, too many open todos or children, excessive depth, prose that reads like code docs.

## Facts & Details
- A fixed layout was chosen over free-form notes so tools and viewers can parse without guessing and humans always know where to look.
- Three todo states mirror question states, avoiding a separate vocabulary.
- The hard size limit is 900 words; past it a node must be split into children.

## Citations
- [skill/scripts/ft.py](../../../skill/scripts/ft.py)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add a dedicated test class for `ft lint`'s base rules (schema-order errors, size warnings, stale Jump line, broken parent/child/wikilink references) — currently only exercised incidentally through other test classes' fixtures, not tested directly

## Children
