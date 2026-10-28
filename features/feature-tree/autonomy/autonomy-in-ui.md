---
name: autonomy-in-ui
status: done
parent: autonomy
tests: cd vscode-feature-tree && npm test
last_verified: 2026-10-29
---
# autonomy-in-ui

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The visual panel and standalone viewer show the same briefing the command line gives, so a human can see what needs them and steer without a terminal. The plan files remain the source of truth; the viewer only presents what they already say.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes with new tests for the needs-you view and paused banner.

## Todos

## Questions


## Implemented
- Needs-you view: a tab in the todo and question box listing everything awaiting a human. Questions still open come first, and those blocking a todo come before the rest, followed by agent-answered questions to confirm, then todos only a human can do. Confirmed questions are excluded.
- The tab label carries a count of open and agent-answered questions plus open human-only todos. With none, the view says nothing needs you.
- Paused banner: when the pause switch file exists, the toolbar shows a banner with the pause reason, or a default wording when empty. The viewer reads that file along with the node files, in both the editor extension and the standalone browser version.
- Filters that make no sense in the current view are hidden.
- Human-only todos carry a person marker everywhere they appear, with a hint that unattended runs skip them.

## Facts & Details
- The weekly-style history digest is not shown here: the viewer reads plain files and has no access to version history, so it would need a new bridge in both hosts for little gain over the briefing.
- The viewer does not itself pause or resume; it only displays state, keeping control in one place.
- It reflects what is on disk, so it reads as read-only until a folder is chosen in the standalone version.

## Citations

## Archived
- [x] (P2) add a Needs-you tab to the floating box built from open/agent-answered questions and HITL todos
- [x] (P3) show a paused banner when `.paused` exists (needs the host to expose it)

## Children
