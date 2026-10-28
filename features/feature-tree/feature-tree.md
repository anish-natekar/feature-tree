---
name: feature-tree
status: planned
parent: 
tests: manual
last_verified: 2026-10-28
---
# feature-tree

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Hierarchical planning method delivered as a Claude skill plus a small `ft` CLI: a tree of markdown nodes under `features/`, versioned with the code, used to plan work without ever touching project code during planning. This root node exists to dogfood the method on itself — it describes feature-tree's own subsystems (CLI, VS Code extension, standalone viewer, hooks, distribution) the same way it would describe any other project's features. There is no single build/test command for the whole project; each child has its own acceptance test, and this node's own test is manual: `ft lint` and `ft index` run clean across the whole tree.

## Acceptance Tests
manual: `python3 skill/scripts/ft.py lint` reports 0 errors across all nodes (including this subtree); `python3 skill/scripts/ft.py tree` shows all 5 children under `feature-tree`.

## Todos
- [ ] (P3) keep this subtree current as the real todos below are implemented — re-run `ft lint`/`ft index` after any further schema or UI change

## Questions

## Implemented
- Scaffolded this root and its 5 children with `ft new`, following the Plan-mode conventions in `skill/SKILL.md` (real Abstract/Acceptance Tests/Todos/Implemented per node, not placeholder text).
Added `## Design Philosophy` to features/SCHEMA.md: natural-language-only intent (no implementation detail), one file per node never fragmented into spec/design/tasks files (explicit rejection of GitHub Spec Kit/AWS Kiro's pattern), and the fog-of-war rule against pre-decomposing vague scope into premature child nodes. EARS-style Acceptance Tests phrasing noted as a style tip, not enforced.

## Facts & Details

## Citations
- [SCHEMA.md](../SCHEMA.md)
- [SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P2) write a `## Design Philosophy` section into `features/SCHEMA.md`: natural-language intent/decisions only (no implementation detail), one file per node never fragmented into separate spec/design/tasks files, and the fog-of-war rule (don't create a child node for scope that's still vague). Researched from Wayfinder, GitHub Spec Kit, and AWS Kiro.

## Children
- [[autonomy]] (done)
- [[claude-hooks]] (planned)
- [[distribution]] (planned)
- [[ft-cli]] (done)
- [[standalone-viewer]] (planned)
- [[vscode-extension]] (planned)
