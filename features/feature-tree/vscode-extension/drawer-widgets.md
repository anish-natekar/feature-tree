---
name: drawer-widgets
status: done
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# drawer-widgets

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The reusable pieces inside the detail drawer that appears when a node is selected: section cards, the todo row, and the multiple-choice question card. The same pieces appear in the graph panel, in a single-node editor tab, and in the floating todo and question box, so a todo or question looks and behaves the same everywhere. They turn plan markers into visible controls: a three-state checkbox on todos, a blocked glyph, a human-only badge, a node picker for blocking, and a radio-style card for questions that offer choices.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "drawer: ...", "todo row: ...", "MCQ: ...", "questions: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Todo row: collapsed it shows only the state selector, a coloured priority badge and the text, so a long list stays scannable. Expanding a row reveals priority, time limit, blocked-on and blocked-by controls and a human-only toggle. A delete control removes the row. Edits save after a short pause in typing, and on leaving the field.
- State: each todo is open, in progress or done, picked directly from a selector rather than clicked through a cycle. Choosing done also marks it complete.
- Markers: a blocked glyph appears when the todo waits on a question that is still open, or on a node that is not yet done. A different glyph shows a todo that was aborted at its time limit. A person badge marks a todo that needs a live human and is skipped by unattended runs. The expanded row can edit all of these. The blocked-on choice lists only questions that are still open (plus any already set), so it does not appear when there is nothing to block on.
- Priority colours match the floating box so the same urgency has the same colour in both.
- Question card: when a question lists options, it shows a radio list with the first option badged as recommended. The badge is display only and is never saved. An extra Other row is always added and reveals the free-text answer flow. Questions without options use the free-text flow unchanged.
- Cleanup rule: when a question is answered or removed, any todo blocked on it loses that marker.

## Facts & Details
- Decision: the first option is the recommendation, mirroring how agents phrase multiple-choice questions, so no extra data is stored.
- Decision: collapsed rows hide secondary controls so the list does not become a wall of boxes.
- Floating box: a draggable window with tabs for todos, questions and items that need a human. Filters cover priority, question state, subtree, text and done items. The human tab gathers open and agent-answered questions, blockers first, plus open human-only todos.
- Data kept: nothing beyond the node's own markdown; every control rewrites its section in place.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge), once `ft-cli`'s marker parsing lands

## Children
