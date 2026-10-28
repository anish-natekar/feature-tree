---
name: live-editing
status: done
parent: standalone-viewer
tests: manual
last_verified: 2026-10-28
---
# live-editing

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The mode the standalone viewer enters after the person picks the plan folder: it reads the real files, keeps itself up to date as they change, and writes edits back. This turns a static picture into a working editor without any server, while limiting what a browser page can touch.

## Methodology
Going live:
1. The person grants read and write access to the plan folder through the browser's native folder chooser.
2. The viewer reads every markdown file in it, including nested ones, plus the marker that says a human paused agent work.
3. While the page is visible it rescans every second and a half and redraws only if some file changed, so edits by agents or other tools appear without a reload.

Writing: an edit in the page is written back to the same file, changing only the touched section. Only markdown files that already exist inside the chosen folder can be written; paths that are empty, climb upward, or lack the markdown ending are rejected, and the viewer never creates files. This keeps a browser page from touching anything outside the plan.

Edge cases: scanning pauses while the page is hidden to avoid wasted work, and resumes when it becomes visible. The folder permission lasts for the page session only, so reopening the page returns to the read-only snapshot (see [[snapshot-mode]]) until a folder is picked again.

Data kept: none; the plan files in the chosen folder are the only state.

## Acceptance Tests
manual checklist: pick the plan folder and confirm the snapshot notice disappears; edit a file with another tool and confirm the page updates within a few seconds; edit a todo in the page and confirm only that file changes; confirm no new file is ever created.

## Todos

## Questions

## Implemented
- Folder picker that switches to live mode.
- Periodic rescan that redraws on change.
- Guarded write-back to existing markdown files only.

## Facts & Details
- Why a guarded write path: a browser page should never write outside the plan or create files.
- Why polling: it needs no server and works with edits from any tool.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
