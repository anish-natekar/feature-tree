---
name: autonomy-in-ui
status: planned
parent: autonomy
tests: cd vscode-feature-tree && npm test
last_verified: 2026-10-29
---
# autonomy-in-ui

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The VS Code panel and standalone viewer should surface the same briefing the CLI gives: a Needs-you list (open questions, assumptions to confirm, HITL todos) and a paused banner, so a human can inspect and steer without a terminal. Deliberately later than the CLI: the markdown stays the source of truth, so the viewer only needs to read what the CLI already defines.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes with new tests for the needs-you view and paused banner.

## Todos
- [ ] (P3) show a paused banner when `.paused` exists (needs the host to expose it)

## Questions


## Implemented
Needs-you tab in the floating box (graph.js refreshQuestionList(true)): open and agent-answered questions, blockers first, plus open HITL todos; count in the tab label; test "needs-you tab".

## Facts & Details

## Citations

## Archived
- [x] (P2) add a Needs-you tab to the floating box built from open/agent-answered questions and HITL todos

## Children
