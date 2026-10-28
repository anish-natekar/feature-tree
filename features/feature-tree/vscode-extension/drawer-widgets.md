---
name: drawer-widgets
status: in-progress
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# drawer-widgets

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Drawer section cards and the todo-row widget: 3-state checkbox cycle, `⛔ blocked by <name>`/`👤 HITL` glyphs, a node-picker select and HITL checkbox for editing those markers, MCQ question cards (radio list + recommended badge + implicit "Other"), and the floating todo/question box.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "drawer: ...", "todo row: ...", "MCQ: ...", "questions: ...", "blocked-by node gates the todo... shown in drawer and floating box").

## Todos

## Questions

## Implemented
- Multiple-choice questions in the drawer's `questionBox()`: radio-button list from `q.options`, first option CSS-badged "recommended" (never written to disk), implicit "Other" row that reveals the original free-text `ans`/`btns` flow; questions without options fall back to that flow unchanged.
- Todo-row UI fix: rewrote `.todo` as flexbox with explicit per-control sizing; blocked-select renders only when there's an open/pending question to block on; time-limit input has a persistent clock-icon wrapper; `data-pri`-driven priority color-coding matching the floating-todo-box palette.
- Todo row and floating todo box render `⛔ blocked by <name>`/`👤 HITL` glyphs for `{blocked-by}`/`{hitl}`, sourced from `tree.js`'s `isBlockedByNode`. Drawer row also has a node-picker select and a checkbox so these are editable, not just read-only.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge), once `ft-cli`'s marker parsing lands

## Children
