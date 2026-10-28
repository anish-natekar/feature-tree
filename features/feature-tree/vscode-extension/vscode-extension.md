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
`vscode-feature-tree/`: a VS Code extension giving the tree a visual home instead of raw markdown, with 3 surfaces — [[graph-panel]], [[node-editor]], [[drawer-widgets]]. All 3 share one `media/graph.js` + `tree.js` + `graph.css` bundle via a `window.FT_MODE`/`FT_HOST` branch, so the parser/renderer logic is written once and tested once.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (`tsc -p .` then `node --test out/test/*.test.js`; 45 tests, aggregate across all 3 children).

## Todos
- [ ] (P2) verify the extension in a real, live VS Code window (installed via the `~/.vscode/extensions` symlink) — so far only exercised through jsdom-simulated `node --test` runs, never an actual Extension Host; applies across all 3 surfaces equally

## Questions

## Implemented

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
- [[drawer-widgets]] (in-progress)
- [[graph-panel]] (in-progress)
- [[node-editor]] (in-progress)
