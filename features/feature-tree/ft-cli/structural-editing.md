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
Restructuring the tree itself: deleting, renaming and moving nodes. Because parent and child relationships come from folder nesting, each of these changes files on disk, so doing it by hand risks broken links and mismatched parents. The tool performs them consistently so users never edit paths.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.StructuralEditTests -v` passes (7 tests).

## Todos

## Questions

## Implemented
- Delete: by default the node's children are reattached to its own parent (or the top level if it had none) and only then is the node removed. Optionally the whole subtree is removed. Without explicit confirmation it only previews what would happen and changes nothing.
- Rename: the new name must be unique and in dashed lowercase form. The node's file and folder are renamed, its name field updated, its children's parent field updated, and every link to it anywhere in the tree, including links with a heading or alias suffix, is rewritten.
- Move: reattaches a node, with all its descendants, under a new parent, or at the top level when given the root marker. A parent that does not exist, the current parent, or one of the node's own descendants is rejected. If the target parent was a plain file it is first promoted to a folder.
- After any of these the section index and statuses are refreshed.
- Folder nodes: a node with children lives in a folder of its own name; moving or deleting one carries or removes the whole folder.

## Facts & Details
- Preview-by-default on delete follows from irreversibility: removing nodes destroys planning history that may only exist in the working tree.
- Reparenting rather than cascading is the default because deleting a branch usually means merging it away, not discarding its children's work.
- Links are rewritten tree-wide on rename so no reader ever follows a dead reference.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
