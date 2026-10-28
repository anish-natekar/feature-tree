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
`{blocked-by: node-name}` (Wayfinder-inspired cross-branch dependency gate): a todo marker that excludes the todo from `ft next`/`ft todos`'s frontier until the target node's `status` is `done`, regardless of where either node sits in the tree. Paired with `{hitl}` + `--afk-only` on `ft next`/`ft todos`, which filters human-only todos out of unattended/looped runs.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DependencyTests -v` passes (4 tests).

## Todos

## Questions

## Implemented
- `{blocked-by: node-name}` (Wayfinder-inspired cross-branch dependency gate): excluded from `ft next`/`ft todos` until the target node's `status` is `done`, regardless of tree position; `ft todos` shows `⛔ blocked by <name>`; `ft lint` warns on a dangling target.
- `{hitl}` flag + `--afk-only` on `ft next`/`ft todos`: filters human-only todos out of unattended/looped runs.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [x] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions

## Children
