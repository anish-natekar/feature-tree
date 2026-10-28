---
name: away-digest
status: done
parent: autonomy
tests: python3 -m unittest skill.tests.test_ft.DigestTests
last_verified: 2026-10-29
---
# away-digest

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
When a human comes back after agents worked alone, they should not have to read diffs to learn what happened. The digest answers one question: what changed in the plan since I last looked? It lists the work agents finished, the questions they raised, the decisions they made on their own and the nodes they added, drawn from the plan's own history, in plain language. It is read-only and complements the briefing, which says what is owed now, while the digest says what already happened.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DigestTests` passes; on a repo with history, `ft digest --since 1.day` lists completed work, new questions, assumed decisions and new nodes, and prints a clear line when nothing changed.

## Todos

## Questions

## Implemented
A returning human can ask what changed in the plan since a given time and get a short list of finished work, questions raised, decisions agents made alone, and new nodes, read from the plan's own history.
Every fresh session now opens with the briefing followed by the recent-changes digest, and the skill tells agents to use the digest when resuming after time away.

## Facts & Details
The digest is command-line only on purpose: the viewer reads plain files and has no access to version history, so showing it there would need a new bridge in both hosts for little gain over the briefing.

## Citations

## Archived
- [x] (P1) `ft digest [--since WHEN]` summarizing finished todos, new questions, agent-assumed decisions and added nodes from git history of the plan
- [x] (P2) mention the digest in the skill's resume step and in the session-start briefing hook

## Children
