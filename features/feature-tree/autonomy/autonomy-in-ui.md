---
name: autonomy-in-ui
status: done
parent: autonomy
tests: cd vscode-feature-tree && npm test
last_verified: 2026-10-29
---
# autonomy-in-ui

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The visual panel and standalone viewer show the same briefing the command line gives, so a human can see what needs them and steer without a terminal. The plan files remain the source of truth; the viewer only presents what they already say.

## Methodology
The viewer reads the plan files from disk, the same way in the editor extension and the standalone browser version, and derives two displays from them. It never changes pause state itself; it only shows it, keeping control in one place.

Needs-you view: a tab in the todo and question box listing everything awaiting a human, in this order:
1. Open questions, with those blocking a todo first.
2. Agent-answered questions to confirm.
3. Todos only a human can do.
Confirmed questions are excluded. The tab label carries a count of open and agent-answered questions plus open human-only todos. With none, the view says nothing needs you. Filters that make no sense in this view are hidden.

Paused banner: when the pause marker exists in the plan folder, the toolbar shows a banner with the stored reason, or default wording when the reason is empty. The marker is read along with the node files.

Human-only todos carry a person marker everywhere they appear, with a hint that unattended runs skip them.

Edge cases: before a folder is chosen the standalone version shows an embedded snapshot and reads as read-only. The history digest is not shown here: the viewer reads plain files and has no access to version history, so it would need a new bridge in both hosts for little gain over the briefing.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes with new tests for the needs-you view and paused banner.

## Todos

## Questions


## Implemented
- Needs-you tab with count.
- Paused banner in both hosts.
- Person marker on human-only todos.

## Facts & Details
- Display only; it reflects whatever is on disk.
- The digest stays command-line only.

## Citations

## Archived
- [x] (P2) add a Needs-you tab to the floating box built from open/agent-answered questions and HITL todos
- [x] (P3) show a paused banner when `.paused` exists (needs the host to expose it)

## Children
