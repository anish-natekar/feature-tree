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
Bootstraps a rough-draft tree from an existing codebase, using its README, manifest and top-level directories, so a project that predates feature-tree does not start from a blank page. It refuses to run when a features folder already has content, so it can never overwrite real planning. Each generated child gets a placeholder abstract marked as a draft, and lint warns while an abstract is still such a placeholder. That warning is a fog-of-war nudge: the node's scope has not actually been sharpened yet and should be written properly or dropped.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.InitTests -v` passes (2 tests).

## Todos

## Questions

## Implemented
- Init command that drafts a tree from an existing codebase and refuses if the features folder is already non-empty.
- Lint warning when an abstract still starts with the draft marker left by init, nudging the author to sharpen the node's scope.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) `ft lint`: warn when an Abstract is still a `DRAFT:` placeholder left over from `ft init`

## Children
