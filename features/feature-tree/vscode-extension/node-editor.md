---
name: node-editor
status: done
parent: vscode-extension
tests: node --test --test-name-pattern "node-editor" out/test/graph.test.js
last_verified: 2026-10-28
---
# node-editor

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A custom editor that opens a single plan node as its own editor tab, showing the same section cards as the graph drawer instead of raw markdown. It stays in sync with the underlying document, so edits by a person, an agent or another tool appear immediately. It is purely a viewer and editor and cannot launch agents.

## Methodology
Opening: the editor is opt-in. A person chooses it from the open-with menu on a plan file, or reaches it from a card in the graph panel. Plain markdown stays the default, because replacing it would surprise people who just want to edit text or diff in version control. Whether to make it the default for plan files is an open question, assumed to stay opt-in meanwhile.

Display: the graph chrome (toolbar, canvas, floating box) is hidden so the single node fills the tab. The node is identified by its path relative to the plan folder, or just its file name if the file lies outside it.

Sync loop:
1. When the document changes, for any reason, push the full text to the page and redraw.
2. Do not rebuild the drawer while a field has focus, so typing is not interrupted.
3. When the person changes something in the page, replace the whole document text and save.
4. Ignore a write whose text equals the current text, which prevents echo loops.

Because writes go through the editor's own document, undo works and other open tabs stay consistent.

Raw view: a control reopens the same file in the plain text editor in the same tab group.

Links: a relative link opens its target if it exists inside the workspace; otherwise a warning is shown.

Messages between page and host are deliberately few: ready, write, raw view, open link and open web address. No message can start a process, which is why this surface cannot launch agents.

Data kept: none of its own; the document is the only state.

## Acceptance Tests
`cd vscode-feature-tree && npm test` (after `tsc -p .`), then `node --test --test-name-pattern "node-editor" out/test/graph.test.js` passes (3 tests, all titled `node-editor mode: ...`).

## Todos

## Questions
- [~] Q1: Should the custom node-editor tab replace plain markdown as the default for files under `features/`, or stay opt-in?
  - O: Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)
  - O: Make it the default editor for `features/**/*.md` except `SCHEMA.md`
  - A (agent): assumed default 'Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)' while unattended; unconfirmed, reopen to change

## Implemented
- Opt-in custom editor for plan files.
- Single-node view with graph chrome hidden.
- Live two-way sync with the document, undo support.
- Raw view switch and guarded link opening.

## Facts & Details
- Decision, assumed by the agent while unattended and unconfirmed: stay opt-in rather than replace plain markdown. Reopen the question to change it.
- The message set between page and host is deliberately minimal and cannot start a process.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) decide whether the `featureTree.node` custom editor should become the *default* editor for `features/**/*.md` (minus `SCHEMA.md`), or stay opt-in via right-click "Open With" as it is now

## Children
