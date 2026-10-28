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
A custom editor that opens a single node as its own editor tab, reusing the drawer UI instead of showing raw markdown. It re-renders live whenever the underlying document changes and talks to the file through a small write, raw and external message bridge. It is purely a visualizer and editor, with no bridge for launching agents.

## Acceptance Tests
`cd vscode-feature-tree && npm test` (after `tsc -p .`), then `node --test --test-name-pattern "node-editor" out/test/graph.test.js` passes (3 tests, all titled `node-editor mode: ...`).

## Todos

## Questions
- [~] Q1: Should the custom node-editor tab replace plain markdown as the default for files under `features/`, or stay opt-in?
  - O: Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)
  - O: Make it the default editor for `features/**/*.md` except `SCHEMA.md`
  - A (agent): assumed default 'Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)' while unattended; unconfirmed, reopen to change

## Implemented
- Single-node editor tab reusing the drawer UI, with live re-render on document changes, the write, raw and external message bridge, and styling that hides the graph chrome so the node fills the tab.
Decision (agent-assumed, unconfirmed Q1): the editor stays opt-in, opened explicitly through Open With or from the graph panel, rather than replacing plain markdown. Revisit by reopening Q1.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) decide whether the `featureTree.node` custom editor should become the *default* editor for `features/**/*.md` (minus `SCHEMA.md`), or stay opt-in via right-click "Open With" as it is now

## Children
