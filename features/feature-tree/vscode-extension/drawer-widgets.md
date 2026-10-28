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
Every widget reads a section of the node's markdown and rewrites only that section when changed, so the node's own file is the only state.

Todo row:
- Collapsed, it shows only the state selector, a coloured priority badge and the text, so long lists stay scannable. Expanded, it reveals priority, time limit, blocked-on and blocked-by controls, a human-only toggle and a delete control.
- State is open, in progress or done, picked directly from a selector rather than cycled by clicking. Choosing done also marks it complete.
- Markers become glyphs: blocked when it waits on a question still open or a node not yet done; a different glyph when it was aborted at its time limit; a person badge when it needs a live human and unattended runs skip it. The blocked-on choice lists only open questions (plus any already set), so it is absent when there is nothing to block on.
- Edits save after a short pause in typing and on leaving the field.
- Priority colours match the floating box so urgency reads the same in both.

Question card:
- With options, it shows a radio list; the first option is badged as recommended (display only, never saved), and an Other row is always appended that reveals a free-text answer box.
- Without options it uses the free-text flow unchanged.
- When a question is answered or removed, any todo blocked on it loses that marker.

Floating box: a draggable window with tabs for todos, questions and items needing a human. Filters cover priority, question state, subtree, text and done items. The human tab gathers open and agent-answered questions, blockers first, plus open human-only todos.

The first option is the recommendation because that is how agents already phrase multiple-choice questions, so no extra data is needed. Secondary controls hide when collapsed so the list does not become a wall of boxes.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "drawer: ...", "todo row: ...", "MCQ: ...", "questions: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Collapsible todo row with state selector, priority badge and marker controls.
- Blocked, time-limit and human-only glyphs.
- Multiple-choice question card with recommended badge and Other row.
- Floating todo and question box with tabs and filters.
- Automatic removal of blocked markers when a question is resolved.

## Facts & Details
- Decision: the first option is the recommendation; nothing extra is stored.
- Decision: collapsed rows hide secondary controls.
- Data kept: nothing beyond the node's own markdown.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge), once `ft-cli`'s marker parsing lands

## Children
