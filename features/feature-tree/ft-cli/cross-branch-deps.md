---
name: cross-branch-deps
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.DependencyTests
last_verified: 2026-10-28
---
# cross-branch-deps

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A way to say that one todo cannot start until a different node is done, no matter where either node sits in the tree. Inspired by Matt Pocock's Wayfinder, the blocked-by marker hides the todo from the list of next work until the target node reaches done status. A second marker flags todos only a human can do, and a flag on the next-work commands filters those out so unattended or looped agent runs never pick them up.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DependencyTests -v` passes (4 tests).

## Todos

## Questions

## Implemented
- Blocked-by marker: the todo is excluded from the next-work frontier until the named node is done, regardless of tree position. The todo listing shows who it is blocked by, and lint warns when the named node does not exist.
- Human-in-the-loop marker plus an away-from-keyboard filter: human-only todos are skipped on unattended or looped runs.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [x] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions

## Children
