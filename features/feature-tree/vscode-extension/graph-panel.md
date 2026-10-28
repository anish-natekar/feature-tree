---
name: graph-panel
status: in-progress
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# graph-panel

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The webview graph panel (`featureTree.openGraph`): the whole tree rendered color-coded by status, zoom/pan, click-to-select drawer with jump chips, floating todo box, and a per-card progress-rollup percentage badge next to the status icon.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "renders one card per node...", "feature chip navigates...", "empty state...", "citations: external links...", "abstract read view renders...", "card shows progress rollup badge...").

## Todos

## Questions

## Implemented
- Graph webview: zoom/pan, status color-coding, click-to-select drawer with jump chips, floating todo box.
- Card head renders a `pctbadge` progress-rollup percentage next to the status select, sourced from `tree.js`'s `rollupProgress`.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
