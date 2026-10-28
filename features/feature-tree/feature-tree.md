---
name: feature-tree
status: done
parent: 
tests: manual
last_verified: 2026-10-28
---
# feature-tree

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A hierarchical planning method delivered as a Claude skill plus a small command line tool: a tree of markdown nodes kept next to the code and versioned with it, used to plan and steer work without touching project code during planning. This root node exists to dogfood the method on itself. It describes feature-tree's own subsystems (the command line tool, the editor extension, the standalone viewer, the hooks and distribution) the same way it would describe any other project's features. There is no single build or test command for the whole project. Each child has its own acceptance test, and this node's own test is manual: lint and index run clean across the whole tree.

## Methodology

## Acceptance Tests
manual: `python3 skill/scripts/ft.py lint` reports 0 errors across all nodes (including this subtree); `python3 skill/scripts/ft.py tree` shows all 5 children under `feature-tree`.

## Todos

## Questions

## Implemented
- Scaffolded this root and its children following the planning conventions in the skill, with real abstracts, tests, todos and notes on each node rather than placeholder text.
- Wrote the Design Philosophy into the schema document: nodes hold natural-language intent and decisions only, never implementation detail; each node is one file and is never fragmented into separate spec, design and task files (an explicit rejection of GitHub Spec Kit and AWS Kiro's pattern); and vague scope is not decomposed into premature child nodes (fog of war). Writing acceptance tests as testable statements is noted as a style tip, not enforced.
All 13 flagged nodes rewritten in plain language; lint now enforces this altitude going forward.
Every leaf now carries a Methodology section that explains how the thing works in plain, language-independent terms: approach, steps and rules, edge cases, data kept and the reasons behind the design. Abstracts stay short, branches stay abstract, and the linter nudges any finished leaf that lacks a Methodology.
The README now explains the idea (a human-readable map one step above the code), the agent and human halves of the loop, the viewer's snapshot and live modes, and gives a short try-it list covering briefing, digest, autonomy and the hooks.

## Facts & Details

## Citations
- [SCHEMA.md](../SCHEMA.md)
- [SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P2) write a `## Design Philosophy` section into `features/SCHEMA.md`: natural-language intent/decisions only (no implementation detail), one file per node never fragmented into separate spec/design/tasks files, and the fog-of-war rule (don't create a child node for scope that's still vague). Researched from Wayfinder, GitHub Spec Kit, and AWS Kiro.
- [x] (P2) rewrite the nodes `ft lint` flags as "reads like code docs" so they state intent, decisions and facts in plain language, with commands kept only in Acceptance Tests
- [x] (P1) deepen every leaf node to behavior-level, language-independent documentation (what it does, inputs and outputs, rules, edge cases, kept data, decisions and why), keeping branches abstract
- [x] (P1) rewrite the project README so a newcomer understands the idea, the autonomous loop, the human controls, and how to install and try it

## Children
- [[autonomy]] (done)
- [[claude-hooks]] (done)
- [[distribution]] (planned)
- [[ft-cli]] (done)
- [[standalone-viewer]] (planned)
- [[vscode-extension]] (planned)
