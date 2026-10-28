---
name: node-editor
status: done
parent: vscode-extension
tests: node --test --test-name-pattern "node-editor" out/test/graph.test.js
last_verified: 2026-10-28
---
# node-editor

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A custom editor that opens a single plan node as its own editor tab, showing the same section cards as the graph drawer instead of raw markdown. It stays in sync with the underlying document, so edits made by a person, an agent or another tool appear immediately. It is purely a viewer and editor; it has no way to launch agents.

## Acceptance Tests
`cd vscode-feature-tree && npm test` (after `tsc -p .`), then `node --test --test-name-pattern "node-editor" out/test/graph.test.js` passes (3 tests, all titled `node-editor mode: ...`).

## Todos

## Questions
- [~] Q1: Should the custom node-editor tab replace plain markdown as the default for files under `features/`, or stay opt-in?
  - O: Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)
  - O: Make it the default editor for `features/**/*.md` except `SCHEMA.md`
  - A (agent): assumed default 'Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)' while unattended; unconfirmed, reopen to change

## Implemented
- Opening: the editor is opt-in. A person picks it explicitly from the open-with choice on a plan file, or reaches it from a card in the graph panel. Plain markdown stays the default.
- Display: the graph chrome (toolbar, canvas, floating box) is hidden so the single node fills the tab. The node is identified by its path relative to the plan folder, or just its file name if the file lies outside it.
- Live sync: whenever the document changes, for any reason, the full text is pushed to the page and redrawn. The drawer is not rebuilt while a field has focus, so typing is not interrupted.
- Writing: a change in the page replaces the whole document text and saves it. Identical text is ignored, which prevents echo loops. Because the write goes through the editor's document, undo works.
- Raw view: a control reopens the same file in the plain text editor in the same tab group.
- Links: a relative link in a section opens the target if it exists inside the workspace; otherwise a warning is shown.
- Decision, assumed by the agent while unattended and unconfirmed: the editor stays opt-in rather than replacing plain markdown for plan files. Reopen the question to change it.

## Facts & Details
- Why opt-in: replacing the default editor would surprise people who just want to edit text or diff in version control,.
- Messages exchanged with the editor host are deliberately few: ready, write, raw view, open link and open web address. No message can start a process.
- Data kept: none of its own; the document is the only state.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) decide whether the `featureTree.node` custom editor should become the *default* editor for `features/**/*.md` (minus `SCHEMA.md`), or stay opt-in via right-click "Open With" as it is now

## Children
