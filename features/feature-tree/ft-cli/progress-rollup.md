---
name: progress-rollup
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.RollupTests
last_verified: 2026-10-28
---
# progress-rollup

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`rollup_progress()`: done/total todo count rolled up across a node and all its descendants, shown as `ft tree`'s `[NN%]` prefix. No badge when a subtree has no todos at all (avoids implying "nothing done" when there's simply nothing to track).

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.RollupTests -v` passes (1 test).

## Todos

## Questions

## Implemented
- `rollup_progress()`: done/total todos across a node + descendants, shown as `ft tree`'s `[NN%]`; no badge when a subtree has no todos.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add `rollup_progress()` (done/total todos across a node + its descendants) and show it in `ft tree` output

## Children
