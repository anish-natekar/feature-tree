---
name: vscode-extension
status: in-progress
parent: feature-tree
tests: npm test
last_verified: 2026-10-28
---
# vscode-extension

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`vscode-feature-tree/`: a VS Code extension giving the tree a visual home instead of raw markdown. A webview graph panel (`featureTree.openGraph`) shows the whole tree color-coded by status with a resizable node drawer (section cards, todo rows, question cards), and a `featureTree.node` `CustomTextEditorProvider` opens a single node as its own editor tab using the same drawer UI. Both share one `media/graph.js` + `tree.js` + `graph.css` bundle via a `window.FT_MODE`/`FT_HOST` branch, so the parser/renderer logic is written once and tested once.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (`tsc -p .` then `node --test out/test/*.test.js`; 45 tests covering parsing, graph rendering, the custom node-editor tab, MCQ questions, the todo-row fix, and blocked-by/HITL/progress-rollup rendering).

## Todos
- [ ] (P2) verify the extension in a real, live VS Code window (installed via the `~/.vscode/extensions` symlink) — so far only exercised through jsdom-simulated `node --test` runs, never an actual Extension Host
- [ ] (P2) decide whether the `featureTree.node` custom editor should become the *default* editor for `features/**/*.md` (minus `SCHEMA.md`), or stay opt-in via right-click "Open With" as it is now {blocked: Q1}

## Questions
- [ ] Q1: Should the custom node-editor tab replace plain markdown as the default for files under `features/`, or stay opt-in?
  - O: Keep opt-in (current — `priority: "option"` in `customEditors`, opened explicitly via "Open With" or from the graph panel)
  - O: Make it the default editor for `features/**/*.md` except `SCHEMA.md`

## Implemented
- Graph webview: zoom/pan, status color-coding, click-to-select drawer with jump chips, floating todo box.
- `featureTree.node` custom editor: single-node tab reusing the drawer UI, `onDidChangeTextDocument` live re-render, `write`/`raw`/`external` postMessage bridge (`nodeHost()` in `graph.js`; the `claude` bridge method and the launch-a-separate-terminal buttons it backed were removed — the extension is now a pure visualizer/editor), CSS that hides graph chrome and fills the tab (`body.node-editor` rules in `graph.css`).
- Fixed packaging bugs that blocked real activation: `package.json` `main` path (`out/extension.js` → `out/src/extension.js`), added `.vscode/launch.json`/`tasks.json` for F5, and a permanent install via symlink into `~/.vscode/extensions/` to avoid the multi-window Extension-Development-Host workflow.
- Multiple-choice questions in the drawer's `questionBox()`: radio-button list from `q.options`, first option CSS-badged "recommended" (never written to disk), implicit "Other" row that reveals the original free-text `ans`/`btns` flow; questions without options fall back to that flow unchanged.
- Todo-row UI fix: root cause was a 5-column CSS grid fed 6+ children, pushing the blocked-on-question dropdown into a near-invisible slot. Rewrote `.todo` as flexbox with explicit per-control sizing; made the blocked-select render only when there's an open/pending question to block on; gave the time-limit input a persistent clock-icon wrapper instead of a placeholder that vanished; added `data-pri`-driven priority color-coding matching the existing floating-todo-box palette.
Drawer todo row, floating todo box, and card() head now render `⛔ blocked by <name>`/`👤 HITL` glyphs for `{blocked-by}`/`{hitl}` and a `pctbadge` progress-rollup percentage next to the status select, sourced from `tree.js`'s `isBlockedByNode`/`rollupProgress`. Drawer row also gained a node-picker select and a checkbox so these are editable, not just read-only.

## Facts & Details

## Citations
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P2) drawer: render `{blocked-by}`/`{hitl}` glyphs on todo rows (dimmed row + blocked icon; HITL badge) and a progress-rollup badge next to each card's status icon, once `ft-cli`'s marker parsing lands

## Children
