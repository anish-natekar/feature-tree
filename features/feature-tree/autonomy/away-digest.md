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
When a human returns after agents worked alone, they should not have to read diffs. The digest answers one question: what changed in the plan since I last looked? It is read-only and complements the briefing, which says what is owed now, while the digest says what already happened.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DigestTests` passes; on a repo with history, `ft digest --since 1.day` lists completed work, new questions, assumed decisions and new nodes, and prints a clear line when nothing changed.

## Todos

## Questions

## Implemented
- Input: a point in time, given in ordinary phrasing such as one day or a date. Output: up to four lists, each with a count: finished work, questions raised, decisions made by an agent and still unconfirmed, and nodes added.
- Source: the plan's version history within that period. Lines newly added as checked-off todos count as finished (question closures are not mistaken for todos); newly added open questions count as raised; agent-assumed answers count as decisions; newly created node files count as added.
- Duplicates are collapsed, order of first appearance kept. A header repeats the chosen period. When nothing matches, it says nothing changed.
- Failure: if the plan is not under version control, it reports that and fails.
- Every fresh agent session opens with the briefing followed by the last day's digest, and the skill tells agents to read it when resuming after time away.

## Facts & Details
- It is available only on the command line; the viewer cannot read history.
- Reading history rather than keeping a separate log means there is nothing extra to maintain and it cannot disagree with the plan.
- A day is the default window for session start because that matches typical away time; humans can widen it.
- Because it works from added lines, work done and reflected within the same period still shows once.

## Citations

## Archived
- [x] (P1) `ft digest [--since WHEN]` summarizing finished todos, new questions, agent-assumed decisions and added nodes from git history of the plan
- [x] (P2) mention the digest in the skill's resume step and in the session-start briefing hook

## Children
