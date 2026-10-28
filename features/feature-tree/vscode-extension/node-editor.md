---
name: node-editor
status: in-progress
parent: vscode-extension
tests: node --test --test-name-pattern "node-editor" out/test/graph.test.js
last_verified: 2026-10-28
---
# node-editor

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The `featureTree.node` `CustomTextEditorProvider`: opens a single node as its own editor tab, reusing the drawer UI, with `onDidChangeTextDocument` live re-render and a `write`/`raw`/`external` postMessage bridge (`nodeHost()` in `graph.js`). Pure visualizer/editor — no agent-launching bridge.

## Acceptance Tests
`cd vscode-feature-tree && npm test` (after `tsc -p .`), then `node --test --test-name-pattern "node-editor" out/test/graph.test.js` passes (3 tests, all titled `node-editor mode: ...`).

## Todos
- [ ] (P2) decide whether the `featureTree.node` custom editor should become the *default* editor for `features/**/*.md` (minus `SCHEMA.md`), or stay opt-in via right-click "Open With" as it is now {blocked: Q1}

## Questions
- [ ] Q1: Should the custom node-editor tab replace plain markdown as the default for files under `features/`, or stay opt-in?
  - O: Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)
  - O: Make it the default editor for `features/**/*.md` except `SCHEMA.md`

## Implemented
- `featureTree.node` custom editor: single-node tab reusing the drawer UI, `onDidChangeTextDocument` live re-render, `write`/`raw`/`external` postMessage bridge (`nodeHost()` in `graph.js`), CSS that hides graph chrome and fills the tab (`body.node-editor` rules in `graph.css`).

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
