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
The viewer has two modes and moves from the first to the second. It first opens as a read-only snapshot of the plan, described in [[snapshot-mode]], and becomes a live, editable view once the person picks the plan folder, described in [[live-editing]].

Generation: the file is rebuilt as a whole from the live extension sources, with the snapshot embedded, so the viewer cannot drift from the extension and every fix to cards, glyphs or progress badges arrives on the next regeneration.

Data kept: none of its own beyond the embedded snapshot; the plan files in the chosen folder are the only state.

## Acceptance Tests
manual: open the generated viewer in a browser, pick the `features/` folder when prompted, confirm the graph renders with the same colors and drawer behavior as the VS Code graph panel.

## Todos
- [ ] (P3) do an actual manual pass in a real browser — so far only verified indirectly via the jsdom test suite in `vscode-feature-tree/test/`, never opened for real {hitl}

## Questions

## Implemented
- Regeneration from the shared extension sources.

## Facts & Details
- Why shared code: one implementation for both surfaces prevents drift.
- Verification gap: so far it has only been exercised through a simulated browser test suite, never opened by hand in a real browser. That manual pass needs a human.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) regenerate `features/viewer.html` (`ft view`) after the blocked-by/HITL glyphs + progress-rollup badge land in `media/` {blocked-by: vscode-extension}

## Children
- [[live-editing]] (done)
- [[snapshot-mode]] (done)
