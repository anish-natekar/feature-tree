---
name: schema
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.TodoStateTests
last_verified: 2026-10-28
---
# schema

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The node format itself: a small metadata header followed by nine sections in fixed order, from Abstract through Children, with a methodology section after the abstract. One file per node, one place to look. Everything else in the tool reads and writes this shape, and the linter enforces it.

## Methodology
A fixed layout was chosen over free-form notes so tools and viewers can parse without guessing and humans always know where to look.

Metadata holds a name, a status (planned, in progress or done), a parent, a test command and a last-verified date. The name must be dashed lowercase and match its file; the parent must match where the file sits in the folder hierarchy, because nesting defines the tree.

Reading and rewriting an untouched node yields byte-identical text, so diffs only show real changes.

A todo is a checkbox with three states (not started, in progress, done), a priority from zero to three or unassigned, text, and optional trailing markers in braces. Questions mirror the same three states (open, agent-answered, confirmed) and may carry options and an answer line; reusing one vocabulary avoids learning two. The next-work choice prefers an in-progress todo over a higher-priority one not yet started, so interrupted work finishes first.

Status is derived, not trusted: in progress if any todo is in progress; done only when there are no open todos or questions and both a test command and a verification date exist; otherwise planned. Indexing refreshes it along with the section jump line.

The linter has two tiers. Errors: wrong section order, malformed todo or question lines, duplicate question numbers, impossible status, bad dates, broken parent or link targets, and size above the hard limit of nine hundred words, past which a node must be split into children. Warnings: under eighty or over six hundred words, missing tests, stale jump line or status, unassigned priorities, too many open todos or children, excessive depth, a missing methodology on a finished leaf, and prose that reads like code documentation.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.TodoStateTests -v` passes (2 tests: 3-state checkbox parse/format round-trip).

## Todos

## Questions

## Implemented
- Metadata header and ten fixed sections.
- Lossless read-and-rewrite.
- Three-state todos and questions, derived status.
- Tiered lint rules.

## Facts & Details
- The size ceiling forces splitting rather than sprawling nodes.
- Status is computed so it cannot be hand-faked without a warning.

## Citations
- [skill/scripts/ft.py](../../../skill/scripts/ft.py)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add a dedicated test class for `ft lint`'s base rules (schema-order errors, size warnings, stale Jump line, broken parent/child/wikilink references) — currently only exercised incidentally through other test classes' fixtures, not tested directly

## Children
