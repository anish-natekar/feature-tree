---
name: cross-branch-deps
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.DependencyTests
last_verified: 2026-10-28
---
# cross-branch-deps

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A way to say that one todo cannot start until some other node is finished, wherever either sits in the tree. Ordinary blocking only works within a node, through a question; this gate links work across branches. A second marker flags todos that only a human can do, so unattended runs leave them alone.

## Methodology
A todo can carry two optional markers at the end of its line, written in curly braces. One names another node; the other says a human is required.

The node gate works like this:
1. Whenever work is listed or chosen, the tool looks up the named node and reads its current status.
2. If that status is anything other than done, the todo is not workable. It vanishes from the next-work choice and from the ready listing, but the full listing still shows it with a note saying which node it waits on, so nothing is hidden.
3. The moment the target reaches done, the todo becomes eligible again with no edit.

If the named node does not exist, the gate does not hold the todo back, so a typo can never freeze work forever; instead the linter raises a warning so the typo gets noticed.

The human-only marker does not change eligibility by itself. The todo is listed everywhere, labeled as needing a human. A filter option on the next-work choice and the listing removes these todos, which is what unattended or looped runs use. The briefing and the viewer put them in the human's inbox.

Both markers are stripped from the todo text when it is archived or matched against.

Why by node and not by todo: a node's status is the one signal that already summarizes whether its work and tests are complete, so no todo-to-todo references are needed and nothing breaks when todos are reflected away. Nothing is ever stored or edited by the gate; it is computed fresh from current statuses on every read, so it cannot go stale.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DependencyTests -v` passes (4 tests).

## Todos

## Questions

## Implemented
- Cross-branch gate on a named node, honored by the next-work choice and the ready listing.
- Dangling-target tolerance plus a linter warning.
- Human-only marker with an unattended filter, surfaced in the briefing and viewer.

## Facts & Details
- Inspired by the Wayfinder approach of hiding work until its prerequisite lands.
- The human-only marker is advisory for agents: it removes the todo from autonomous selection but does not stop an interactive agent from doing it if a human asks.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [x] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions

## Children
