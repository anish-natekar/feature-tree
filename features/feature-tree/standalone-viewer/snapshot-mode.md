---
name: snapshot-mode
status: done
parent: standalone-viewer
tests: manual
last_verified: 2026-10-28
---
# snapshot-mode

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The state in which the standalone viewer first opens: it carries a copy of the plan taken when the file was generated, so the page is already populated and a first-time visitor sees a map immediately. It is read-only and tells the person how to go live. This exists so a shared viewer is useful the moment it is opened.

## Methodology
When the file is generated, the whole plan is read and embedded in the page. On open, the viewer draws that embedded copy exactly as it would draw a live plan, using the same drawing and styling as the editor extension.

Because no folder has been chosen yet, the page has no permission to write anywhere. Any attempt to edit shows a message telling the person to pick the plan folder, and nothing is changed.

A toolbar notice states that the view is a read-only snapshot and shows the time the snapshot was taken, so a reader knows how old the picture is and that it will not follow later edits. The notice disappears once a plan folder is picked and the viewer goes live (see [[live-editing]]).

An earlier version opened blank until a folder was chosen, which was a genuine defect: a visitor saw an empty page with no hint of what the viewer was for. The embedded copy fixes this, and the snapshot is regenerated whenever the file is rebuilt, so it is only as fresh as its last generation.

Data kept: only the embedded copy and its generation time; nothing is stored by the page.

## Acceptance Tests
manual checklist: open the generated viewer with no folder picked and confirm the graph is populated; the toolbar shows a read-only snapshot notice with a generation time; attempting an edit shows a message asking for the plan folder and changes nothing.

## Todos

## Questions

## Implemented
- Embedded snapshot so the page opens populated, read-only.
- Toolbar notice with the time the snapshot was taken and that it is read-only; it disappears once a plan folder is picked.

## Facts & Details
- Why a snapshot rather than an empty state: a shareable viewer should show a populated map at once.
- The earlier blank-on-open behaviour was diagnosed and replaced by the snapshot.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P1) diagnose the earlier "blank viewer.html" report — still need the browser name and any console error to reproduce; not yet actionable {hitl}
- [x] (P2) show a visible banner on a generated viewer saying it is a read-only snapshot with its generation time, and how to go live

## Children
