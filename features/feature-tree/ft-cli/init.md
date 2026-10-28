---
name: init
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.InitTests
last_verified: 2026-10-28
---
# init

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Bootstraps a rough-draft tree from an existing project so one that predates the planning tool does not start from a blank page. It produces a starting point for the planning interview, not a finished plan.

## Methodology
Input is the project folder to survey; output is one root node plus one child node per top-level folder. The path of the root is printed, followed by a nudge to run the planning interview next.

Steps:
1. Refuse if the planning folder already holds any node. It stops with an error and changes nothing; it never merges or overwrites.
2. Name the root from the project's declared name in its manifest when there is one, otherwise from the folder name, lowercased and reduced to letters and dashes. Child names get the same treatment.
3. Write the root's abstract from the first non-heading paragraph of the readme, else the manifest description, else a draft placeholder.
4. Create one child per top-level folder, each with a one-line draft placeholder saying what its folder presumably does. Hidden folders, dependency and build output, virtual environments, editor settings and the planning folder itself are skipped. The number of children is capped so a sprawling repository does not yield an unreadable tree, and a folder whose name collides with the root's is dropped.

Draft placeholders begin with an obvious marker, and the linter warns while an abstract still begins with it, so unrefined nodes stay visible until someone writes a real abstract or removes the node.

Why so shallow: init reads only names and a few top-level files and never analyzes source, because guessing intent from code would produce confident but wrong prose. Children are created flat under the root; deeper structure is left to the interview. The draft warning is a fog-of-war nudge: a node whose scope cannot yet be stated sharply should live as a loose todo or question on its parent instead.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.InitTests -v` passes (2 tests).

## Todos

## Questions

## Implemented
- Root plus flat children generated from readme, manifest and top-level folders.
- Refusal on a non-empty plan folder.
- Linter warning for unrefined draft abstracts.

## Facts & Details
- The placeholders are intentionally obvious rather than plausible.
- Structure beyond one level is deliberately left to the planning interview.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`

## Children
