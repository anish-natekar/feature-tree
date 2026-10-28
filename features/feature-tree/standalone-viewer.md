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
A single-file viewer that opens in an ordinary browser, for anyone without the editor extension or a notes app. It needs no server and no build step. It contains exactly the same tree parsing, graph drawing and styling as the editor extension, so what a person sees there is what they see here. The only difference is the host: instead of the editor's message channel, a small browser host reads and writes plan files in a folder the person picks. The generate command rebuilds the file from the live extension sources, so the two surfaces cannot drift apart.

## Acceptance Tests
manual: open `features/viewer.html` in a browser, pick the `features/` folder when prompted, confirm the graph renders with the same colors/drawer behavior as the VS Code graph panel.

## Todos
- [ ] (P3) do an actual manual pass in a real browser — so far only verified indirectly via the jsdom test suite in `vscode-feature-tree/test/`, never opened for real {hitl}

## Questions

## Implemented
- Opening: the page loads already populated from a snapshot of the plan taken when the file was generated. In this state it is read-only, and an edit attempt shows a message telling the person to pick the plan folder. Before this snapshot existed the page opened blank until a folder was chosen; that was a genuine defect, not a browser quirk.
- Picking a folder: the person grants read and write access to the plan folder through the browser's native folder chooser. The viewer then reads every markdown file in it, including nested ones, plus the marker file that says a human paused agent work, and switches from snapshot to live mode.
- Live updates: while the page is visible it rescans the folder every second and a half and redraws only if some file changed, so edits made by agents or other tools appear without a reload.
- Writing: edits made in the page are written back to the same file, but only to markdown files that already exist inside the chosen folder. Paths that are empty, climb upward, or do not end in the markdown extension are rejected, and the viewer never creates files.

## Facts & Details
- Why a snapshot rather than an empty state: a first-time visitor sees a populated map immediately, which is the point of a shareable viewer.
- Why shared code: one implementation for both surfaces means every fix to cards, glyphs or progress badges reaches the viewer on the next regeneration.
- Verification gap: so far it has only been exercised through a simulated browser test suite, never opened by hand in a real browser. That manual pass needs a human.

## Citations
- [features/SCHEMA.md](../SCHEMA.md)

## Archived
- [x] (P3) regenerate `features/viewer.html` (`ft view`) after the blocked-by/HITL glyphs + progress-rollup badge land in `media/` {blocked-by: vscode-extension}
- [x] (P1) diagnose the earlier "blank viewer.html" report — still need the browser name and any console error to reproduce; not yet actionable {hitl}

## Children
