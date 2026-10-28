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
A single-file, no-build browser viewer for anyone without VS Code or Obsidian. It reuses exactly the same tree, graph and styling code as the editor extension, swapping in a web host that reads a user-picked local folder through the browser's File System Access API instead of the VS Code messaging bridge. The view command regenerates the file from the live extension sources, so the two surfaces never drift apart.

## Acceptance Tests
manual: open `features/viewer.html` in a browser, pick the `features/` folder when prompted, confirm the graph renders with the same colors/drawer behavior as the VS Code graph panel.

## Todos
- [ ] (P1) diagnose the earlier "blank viewer.html" report — still need the browser name and any console error to reproduce; not yet actionable
- [ ] (P3) do an actual manual pass in a real browser — so far only verified indirectly via the jsdom test suite in `vscode-feature-tree/test/`, never opened for real

## Questions

## Implemented
- Web host: a stand-in for the extension's host interface built on the File System Access API, covering the folder picker, reading and writing files, and opening a raw file with the browser's default handler.
- View command: bundles the shared code and styling plus the web host into one self-contained viewer page, regenerated after the multiple-choice question and todo-row fixes with lint still at zero errors.
The viewer was regenerated again after the blocked-by and human-only glyphs and the progress-rollup badge landed in the shared code.

## Facts & Details

## Citations
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P3) regenerate `features/viewer.html` (`ft view`) after the blocked-by/HITL glyphs + progress-rollup badge land in `media/` {blocked-by: vscode-extension}

## Children
