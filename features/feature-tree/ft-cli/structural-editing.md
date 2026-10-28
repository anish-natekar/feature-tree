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
Restructuring the tree itself, not just editing a node's frontmatter. Because the parent and child relationship comes from folder nesting, deleting, renaming and moving nodes are real filesystem operations. Delete reparents the node's children by default (or removes the whole subtree on request) and only previews what it would do until the user confirms. Rename updates the parent field and every wikilink across the tree. Move reattaches a node under a new parent, or at the top level. This keeps the tree consistent so users never hand-edit paths and links.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.StructuralEditTests -v` passes (7 tests).

## Todos

## Questions

## Implemented
- Delete with child reparenting by default, optional subtree removal, and a dry run unless confirmed.
- Rename that rewrites parent fields and wikilinks tree-wide.
- Move to a new parent or to the top level.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
