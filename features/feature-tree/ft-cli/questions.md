---
name: questions
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.QuestionOptionTests
last_verified: 2026-10-28
---
# questions

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Multiple-choice questions: `ft ask <node> "text" --option "..." --option "..."` (repeatable), written as `- O:` sub-lines under the question. First option is CSS/display-flagged "recommended"; "Other" is always implicit and never hand-written to disk.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.QuestionOptionTests -v` passes (3 tests).

## Todos

## Questions

## Implemented
- Multiple-choice questions: `ft ask <node> "text" --option "..." --option "..."` (repeatable), written as `- O:` sub-lines under the question; first option = recommended, "Other" always implicit — never hand-written to disk.
lint warns on single-option and duplicate-option questions; covered by LintBaseTests.

## Facts & Details

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) lint check for degenerate MCQ options (duplicate option text, or a question with only one `- O:` line)

## Children
