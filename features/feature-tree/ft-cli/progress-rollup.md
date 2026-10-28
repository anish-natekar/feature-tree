---
name: progress-rollup
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.RollupTests
last_verified: 2026-10-28
---
# progress-rollup

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A completion figure for any node, counting finished versus total todos across the node and everything beneath it, shown as a percentage next to each node in the tree view. It lets a reader see at a glance which branches are nearly done and which have barely started.

## Methodology
The figure is computed on demand from the node files; nothing is stored, so it cannot drift from the plan.

Rules:
1. Every todo on a node counts once toward its total, and checked ones count as done. Todos that are only partly done (in progress) count as not yet done.
2. A parent adds its children's totals to its own, recursively, so the root reflects the whole project.
3. The percentage is rounded to a whole number and prefixed to the node line in the tree view.
4. A subtree containing no todos at all shows no percentage. Showing zero would wrongly suggest nothing is finished when there is simply nothing to track.

The whole-project briefing computes its own figure slightly differently: it also counts todos already archived by reflection as done, because archiving removes them from the live list and the figure would otherwise shrink as work is tidied. The tree badge counts only todos still listed, so a node whose work was entirely reflected away shows no badge rather than one hundred percent.

Why count todos and not effort: a trivial todo and a large one weigh the same. That was accepted as the cheapest honest signal; priorities and time limits are not used as weights. Questions do not count toward progress; they are tracked separately as things awaiting a human.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.RollupTests -v` passes (1 test).

## Todos

## Questions

## Implemented
- Recursive done-over-total percentage on every node in the tree view.
- No badge for subtrees without todos.
- A separate archive-aware figure in the briefing.

## Facts & Details
- Derived, never stored.
- Measures todo count, not effort; an accepted simplification.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add `rollup_progress()` (done/total todos across a node + its descendants) and show it in `ft tree` output

## Children
