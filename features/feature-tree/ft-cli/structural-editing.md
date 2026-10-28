---
name: structural-editing
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.StructuralEditTests
last_verified: 2026-10-28
---
# structural-editing

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Structural editing: filesystem operations, not just frontmatter edits, since the parent/child relationship is derived from folder nesting. `ft delete <name> [--subtree] [--yes]` (reparents direct children by default, dry-run unless `--yes`), `ft rename <old> <new>` (updates `parent:` + wikilinks tree-wide), `ft move <name> <new-parent|->`.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.StructuralEditTests -v` passes (7 tests).

## Todos

## Questions

## Implemented
- Structural editing (filesystem operations, not just frontmatter): `ft delete <name> [--subtree] [--yes]` (reparents direct children by default, dry-run unless `--yes`), `ft rename <old> <new>` (updates `parent:` + wikilinks tree-wide), `ft move <name> <new-parent|->`.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
