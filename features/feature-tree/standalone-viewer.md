---
name: standalone-viewer
status: planned
parent: feature-tree
tests: manual
last_verified: 2026-10-28
---
# standalone-viewer

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`features/viewer.html`: a single-file, no-build browser viewer for anyone without VS Code or Obsidian. It reuses the exact same `tree.js`/`graph.js`/`graph.css` bundle as the extension, swapping in a `host-web.js` implementation of the `FT_HOST` interface that reads a user-picked local folder via the File System Access API instead of the VS Code messaging bridge. `ft view` regenerates it from the live `media/` sources, so the two surfaces never drift apart.

## Acceptance Tests
manual: open `features/viewer.html` in a browser, pick the `features/` folder when prompted, confirm the graph renders with the same colors/drawer behavior as the VS Code graph panel.

## Todos
- [ ] (P1) diagnose the earlier "blank viewer.html" report — still need the browser name and any console error to reproduce; not yet actionable
- [ ] (P3) do an actual manual pass in a real browser — so far only verified indirectly via the jsdom test suite in `vscode-feature-tree/test/`, never opened for real

## Questions

## Implemented
- `host-web.js`: `FT_HOST`-shaped bridge over the File System Access API (folder picker, file read/write, "open raw" via browser default handler).
- `ft view`: bundles `tree.js` + `graph.js` + `graph.css` + `host-web.js` into one self-contained `features/viewer.html`, regenerated successfully after the MCQ-questions and todo-row fixes (`ft lint` → 0 errors after regeneration).
Regenerated `features/viewer.html` via `ft view` after the blocked-by/HITL glyph rendering and progress-rollup badge landed in `media/graph.js`/`tree.js`/`graph.css`.

## Facts & Details

## Citations
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P3) regenerate `features/viewer.html` (`ft view`) after the blocked-by/HITL glyphs + progress-rollup badge land in `media/` {blocked-by: vscode-extension}

## Children
