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
The VS Code panel and standalone viewer should surface the same briefing the CLI gives: a Needs-you list (open questions, assumptions to confirm, HITL todos) and a paused banner, so a human can inspect and steer without a terminal. The markdown stays the source of truth, so the viewer only presents what the command line already defines.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes with new tests for the needs-you view and paused banner.

## Todos

## Questions


## Implemented
The viewer has a Needs-you view listing open and agent-decided questions (work-blocking ones first) and tasks only a human can do, with a count on its tab. A banner shows when work is paused. Filter controls that do not apply to the current view are hidden.

## Facts & Details

## Citations

## Archived
- [x] (P2) add a Needs-you tab to the floating box built from open/agent-answered questions and HITL todos
- [x] (P3) show a paused banner when `.paused` exists (needs the host to expose it)

## Children
