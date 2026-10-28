---
name: graph-panel
status: done
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# graph-panel

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The main visual surface of the extension: the whole plan drawn as a graph of cards, one per node, joined to their parents by lines. Each card is coloured by status and shows a progress percentage. The panel opens beside the code and follows the plan folder live, so a person can read and edit the plan without leaving the editor.

## Methodology
Input and layout:
1. Read every markdown node under the plan folder. Files without a status in their header, and the schema file, are ignored.
2. Attach each node to the parent named in its header.
3. Draw one card per node. Cards expand to show their abstract or collapse to save space. Toolbar buttons expand all, collapse all, and fit the graph into view. The first load fits automatically; fitting never zooms in past natural size and never below a readable minimum.

Navigation: dragging empty space pans, the wheel zooms around the cursor between a low and a high limit, and dragging on a card does not pan, so cards can be used without moving the view.

Selection: clicking a card opens a drawer with all sections and chips that jump to related nodes. A legend counts nodes per status, and status can be changed on the card itself. Opening a node's full page launches the single-node editor.

Progress badge: the share of done todos across the node and all its descendants, hidden when the subtree has no todos. Descendants are counted so a branch shows how far its whole subtree has come, which its own todos could not tell.

Other surfaces: a toolbar toggle opens the tree-wide todo and question box; a banner says when and by whom agent work was paused; with no nodes, an empty state invites opening the plan folder.

Live updates: the panel reloads whenever any plan file is created, changed or deleted, but does not rebuild the drawer while the person is typing in it. Writes go through the editor's own document so open tabs stay in sync and undo works.

Links: file links open only inside the workspace and outside ones are refused with a warning; web links open externally.

Only one panel exists at a time; invoking it again reveals the existing one. It activates only in workspaces containing a plan, and is reachable from a status bar button and a sidebar welcome button.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "renders one card per node...", "feature chip navigates...", "empty state...", "citations: external links...", "abstract read view renders...", "card shows progress rollup badge...").

## Todos

## Questions

## Implemented
- Card graph with status colours, expand and collapse, fit, pan and zoom.
- Detail drawer with jump chips and status legend.
- Progress badge with subtree rollup.
- Toolbar toggle for the floating box, paused banner and empty state.
- Live reload on any plan file change.
- Safe link handling.

## Facts & Details
- Decision: one panel at a time.
- Decision: the progress badge counts descendants.
- Writes go through the editor's own document.
- Activation only in workspaces that contain the plan.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
