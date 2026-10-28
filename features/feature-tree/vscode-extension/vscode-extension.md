---
name: vscode-extension
status: planned
parent: feature-tree
tests: npm test
last_verified: 2026-10-28
---
# vscode-extension

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A VS Code extension giving the tree a visual home instead of raw markdown, with three surfaces: [[graph-panel]], [[node-editor]] and [[drawer-widgets]]. All three share one bundle of tree-parsing, graph-drawing and styling code, switched between modes by the host that embeds it, so the parser and renderer logic is written once and tested once. The extension lives in its own folder in the repository.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (`tsc -p .` then `node --test out/test/*.test.js`; 45 tests, aggregate across all 3 children).

## Todos
- [ ] (P2) verify the extension in a real, live VS Code window (installed via the `~/.vscode/extensions` symlink) — so far only exercised through jsdom-simulated `node --test` runs, never an actual Extension Host; applies across all 3 surfaces equally {hitl}

## Questions

## Implemented

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
- [[drawer-widgets]] (done)
- [[graph-panel]] (done)
- [[node-editor]] (done)
