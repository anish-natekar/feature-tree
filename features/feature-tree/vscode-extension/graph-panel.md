---
name: graph-panel
status: done
parent: vscode-extension
tests: npm test
last_verified: 2026-10-28
---
# graph-panel

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The main visual surface of the extension: the whole plan drawn as a graph of cards, one card per node, joined to their parents by lines. Each card is coloured by its status (planned, in progress, done) and shows a progress percentage next to the status control. The panel opens beside the code, follows the plan folder live, and lets a person read and edit the plan without leaving the editor.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (shared suite; relevant tests: "renders one card per node...", "feature chip navigates...", "empty state...", "citations: external links...", "abstract read view renders...", "card shows progress rollup badge...").

## Todos

## Questions

## Implemented
- Input: every markdown node under the plan folder. Files without a status in their header, and the schema file, are ignored. Children are attached to the parent named in each node's header.
- Layout: one card per node. Cards can be expanded to show their abstract and collapsed to save space; toolbar buttons expand all, collapse all, and fit the whole graph into view. The first load fits automatically. Fitting never zooms in past natural size and never below a readable minimum.
- Navigation: dragging empty space pans; the wheel zooms around the cursor between a low and a high limit. Dragging on a card does not pan.
- Selection: clicking a card opens a drawer with all sections, with chips that jump to related nodes. A legend in the toolbar counts nodes per status. Status can be changed directly on the card.
- Progress badge: the percentage is the share of done todos across the node and all its descendants. It is hidden when the subtree has no todos.
- Floating box: a toggle in the toolbar opens the tree-wide todo and question box.
- Paused banner: when a human has paused agent work, a banner says so and by whom.
- Empty state: with no nodes, a prompt invites opening the plan folder.
- Updates: the panel reloads whenever any plan file is created, changed or deleted. The drawer is not rebuilt while the person is typing in it.
- Opening a node's full page launches the single-node editor. Links to files open inside the workspace only; links outside it are refused with a warning. Web links open externally.

## Facts & Details
- Decision: one panel at a time; invoking it again reveals the existing one.
- Decision: the progress badge counts descendants so a branch shows how far its whole subtree has come, which a branch's own todos could not tell.
- Writes go through the editor's own document so open tabs stay in sync and undo works.
- The panel is reachable from a status bar button and a sidebar welcome button, and only activates in workspaces that contain the plan.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
