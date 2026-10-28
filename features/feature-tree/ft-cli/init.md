---
name: init
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.InitTests
last_verified: 2026-10-28
---
# init

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Bootstraps a rough-draft tree from an existing project so one that predates the planning tool does not start from a blank page. It produces a starting point for the planning interview, not a finished plan.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.InitTests -v` passes (2 tests).

## Todos

## Questions

## Implemented
- Input: the project folder to survey. Output: one root node plus one child node per top-level folder, and the path of the root is printed, followed by a nudge to run the planning interview next.
- Naming: the root takes the project's declared name from its manifest when there is one, otherwise the folder name, lowercased and reduced to dashes and letters. Child names get the same treatment.
- Root abstract: the first non-heading paragraph of the readme, else the manifest description, else a draft placeholder. Each child gets a one-line draft placeholder saying what its folder does.
- Skipped folders: hidden folders, dependency and build output, virtual environments, editor settings, and the planning folder itself. Children are capped in number so a sprawling repository does not produce an unreadable tree. A folder that would collide with the root's name is dropped.
- Refusal: if the planning folder already holds any node, init stops with an error and changes nothing. It never merges or overwrites.
- Draft warning: the linter warns while an abstract still begins with the draft marker, so unrefined nodes stay visible until someone writes a real abstract or removes the node.

## Facts & Details
- Init reads only names and a few top-level files; it does not analyze source, because guessing intent from code would produce confident but wrong prose. The placeholders are intentionally obvious.
- The draft warning is a fog-of-war nudge: a node whose scope cannot yet be stated sharply should live as a loose todo or question on its parent instead of a node.
- Children are created flat under the root; deeper structure is left to the interview.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`

## Children
