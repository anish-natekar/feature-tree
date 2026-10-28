---
name: todo-rows
status: done
parent: drawer-widgets
tests: npm test
last_verified: 2026-10-28
---
# todo-rows

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The todo row shown in the drawer and the floating box. It lets a person see a long list of todos at a glance and, when needed, change a todo's state, priority, time limit and blockers in place. It turns the textual markers on a todo line into visible, editable controls.

## Methodology
Collapsed, a row shows only the state selector, a coloured priority badge and the text, so long lists stay scannable. Expanded, it reveals priority, time limit, blocked-on and blocked-by controls, a human-only toggle and a delete control.

State is open, in progress or done, picked directly from a selector rather than cycled by clicking. Choosing done also marks it complete.

Markers become glyphs:
- Blocked, when the todo waits on a question still open or on a node not yet done.
- A different glyph when it was aborted at its time limit.
- A person badge when it needs a live human and unattended runs skip it.

The blocked-on choice lists only open questions (plus any already set), so it is absent when there is nothing to block on. Priority colours match the floating box so urgency reads the same in both places.

Edits save after a short pause in typing and on leaving the field, and only the todos section of the node is rewritten. Deleting a todo removes only its line.

Data kept: nothing beyond the todo line in the node's own markdown.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (relevant tests: "todo row: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Collapsible todo row with state selector, priority badge and marker controls.
- Blocked, time-limit and human-only glyphs.

## Facts & Details
- Decision: collapsed rows hide secondary controls so the list stays readable.
- Decision: state is chosen from a selector, not cycled by clicking, to avoid accidental changes.

## Citations
- [features/SCHEMA.md](../../../../SCHEMA.md)

## Archived

## Children
