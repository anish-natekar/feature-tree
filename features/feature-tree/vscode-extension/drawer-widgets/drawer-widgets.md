---
name: drawer-widgets
status: done
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# drawer-widgets

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The reusable pieces inside the detail drawer that appears when a node is selected: section cards, the todo row, and the multiple-choice question card. The same pieces appear in the graph panel, the single-node editor tab and the floating todo and question box, so a todo or question looks and behaves the same everywhere. They turn plan markers into visible controls.

## Methodology
Every widget reads a section of the node's markdown and rewrites only that section when changed, so the node's own file is the only state. Nothing else is stored.

Section cards show each part of the node. Prose inside them renders numbered and bulleted lines as real lists, so step-by-step methodology reads as steps instead of one run-on paragraph.

The two interactive widgets are described in their own nodes: [[todo-rows]] for the collapsible todo row and its marker controls, and [[questions-widget]] for the multiple-choice question card.

Floating box: a draggable window with tabs for todos, questions and items needing a human. Filters cover priority, question state, subtree, text and done items. The human tab gathers open and agent-answered questions, blockers first, plus open human-only todos. It reuses the same row and card widgets, so nothing looks different between the drawer and the box.

Secondary controls hide when collapsed so the list does not become a wall of boxes.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "drawer: ...", "todo row: ...", "MCQ: ...", "questions: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Section cards with list rendering for numbered and bulleted prose.
- Floating todo and question box with tabs and filters.
- Todo row and question card, detailed in the children.

## Facts & Details
- Decision: collapsed rows hide secondary controls.
- Data kept: nothing beyond the node's own markdown.

## Citations
- [features/SCHEMA.md](../../../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge), once `ft-cli`'s marker parsing lands
- [x] (P1) render numbered and bulleted lists inside prose sections as real lists (they currently run together as one paragraph)

## Children
- [[questions-widget]] (done)
- [[todo-rows]] (done)
