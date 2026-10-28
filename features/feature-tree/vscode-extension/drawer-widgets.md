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
The drawer's section cards and the todo-row widget, shared by the graph panel, node tab and floating box. They provide: a three-state checkbox cycle on todos, blocked-by and human-only glyphs, a node picker and a checkbox for editing those markers, multiple-choice question cards (a radio list, a recommended badge and an implicit Other choice), and the floating todo and question box.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "drawer: ...", "todo row: ...", "MCQ: ...", "questions: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Multiple-choice questions: a radio list built from the question's options, with the first option badged as recommended (the badge is display-only and never written to disk). An implicit Other row reveals the original free-text answer flow, and questions without options fall back to that flow unchanged.
- Todo-row layout fix: the row was rebuilt with explicit sizing per control; the blocked-by selector appears only when there is an open question to block on; the time-limit input keeps a persistent clock icon; and priority color-coding matches the floating box's palette.
- Todo rows and the floating box show a blocked-by glyph and a human-only badge. The drawer row also has a node picker and a checkbox so these markers are editable, not just displayed.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge), once `ft-cli`'s marker parsing lands

## Children
