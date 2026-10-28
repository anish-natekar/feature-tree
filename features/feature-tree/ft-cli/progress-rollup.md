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
A completion figure for any node, counting finished versus total todos across the node and everything beneath it, shown as a percentage next to each node in the tree view. It lets a reader see at a glance which branches are nearly done and which have barely started.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.RollupTests -v` passes (1 test).

## Todos

## Questions

## Implemented
- Counting: every todo on a node counts once toward the total, and checked ones count as done. A parent adds its children's totals to its own, recursively, so the root reflects the whole project.
- Display: the percentage is rounded to a whole number and prefixed to the node line in the tree view.
- No todos, no badge: a subtree containing no todos at all shows no percentage. Showing zero would wrongly suggest nothing is finished when there is simply nothing to track.
- Partly done todos (the in-progress state) count as not yet done.
- The whole-project briefing computes its own figure slightly differently: it also counts todos already archived by reflection as done, because archiving removes them from the live list. The tree badge counts only todos still listed, so a node whose work was fully reflected away shows no badge rather than one hundred percent.

## Facts & Details
- Derived on demand from the node files; nothing is stored, so the number cannot drift from the plan.
- The percentage measures todo count, not effort: a trivial todo and a large one weigh the same. This was accepted as the cheapest honest signal; priorities and time limits are not used as weights.
- Questions do not count toward progress; they are tracked separately as things awaiting a human.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add `rollup_progress()` (done/total todos across a node + its descendants) and show it in `ft tree` output

## Children
