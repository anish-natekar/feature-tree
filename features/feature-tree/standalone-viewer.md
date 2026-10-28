---
name: standalone-viewer
status: planned
parent: feature-tree
tests: manual
last_verified: 2026-10-28
---
# standalone-viewer

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A single-file viewer that opens in an ordinary browser, for anyone without the editor extension or a notes app. It needs no server and no build step, and it contains the same tree parsing, graph drawing and styling as the editor extension, so both surfaces look and behave the same. Only the host differs: a small browser host reads and writes plan files in a folder the person picks.

## Methodology
The viewer has two modes and moves from the first to the second.

Snapshot mode (on open): the file embeds a copy of the plan taken when it was generated, so the page opens already populated and a first-time visitor sees a map immediately. This mode is read-only; an edit attempt shows a message telling the person to pick the plan folder. An earlier version opened blank until a folder was chosen, which was a genuine defect.

Live mode (after picking a folder):
1. The person grants read and write access to the plan folder through the browser's native folder chooser.
2. The viewer reads every markdown file in it, including nested ones, plus the marker that says a human paused agent work.
3. While the page is visible it rescans every second and a half and redraws only if some file changed, so edits by agents or other tools appear without a reload.

Writing: an edit in the page is written back to the same file. Only markdown files that already exist inside the chosen folder can be written; paths that are empty, climb upward, or lack the markdown ending are rejected, and the viewer never creates files. This keeps a browser page from touching anything outside the plan.

Generation: the file is rebuilt as a whole from the live extension sources, with the snapshot embedded, so the viewer cannot drift from the extension and every fix to cards, glyphs or progress badges arrives on the next regeneration.

Data kept: none of its own beyond the embedded snapshot; the plan files in the chosen folder are the only state. The folder permission lasts for the page session.

## Acceptance Tests
manual: open `features/viewer.html` in a browser, pick the `features/` folder when prompted, confirm the graph renders with the same colors/drawer behavior as the VS Code graph panel.

## Todos
- [ ] (P3) do an actual manual pass in a real browser — so far only verified indirectly via the jsdom test suite in `vscode-feature-tree/test/`, never opened for real {hitl}

## Questions

## Implemented
- Embedded snapshot so the page opens populated, read-only.
- Folder picker that switches to live mode.
- Periodic rescan that redraws on change.
- Guarded write-back to existing markdown files only.
- Regeneration from the shared extension sources.

## Facts & Details
- Why a snapshot rather than an empty state: a shareable viewer should show a populated map at once.
- Why shared code: one implementation for both surfaces prevents drift.
- Verification gap: so far it has only been exercised through a simulated browser test suite, never opened by hand in a real browser. That manual pass needs a human.

## Citations
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P3) regenerate `features/viewer.html` (`ft view`) after the blocked-by/HITL glyphs + progress-rollup badge land in `media/` {blocked-by: vscode-extension}
- [x] (P1) diagnose the earlier "blank viewer.html" report — still need the browser name and any console error to reproduce; not yet actionable {hitl}

## Children
