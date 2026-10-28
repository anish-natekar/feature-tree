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
Questions are how an agent or planner records a decision it cannot make alone. A question may carry a short list of candidate answers, which makes it quick for a human to settle and lets an unattended agent adopt a safe default.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.QuestionOptionTests -v` passes (3 tests).

## Todos

## Questions

## Implemented
- Asking: given a node and question text, the tool appends a new open question with the next free number on that node. Numbers are per node and only grow. Repeating the option argument adds candidate answers. Whitespace in text and options is collapsed to single spaces.
- Options: stored as indented lines under the question. The first option is the recommended one and is displayed marked as such. An "Other" choice is always offered by viewers implicitly and is never written to the file.
- States: open, answered by an agent but unconfirmed, and confirmed by a human. Listing shows open and agent-answered ones by default; flags narrow to open only or widen to everything. A question that blocks a still-open todo is tagged as blocking, so urgent ones stand out.
- Lint: a question with only one option, or with repeated option text, draws a warning, since a single option is not a choice.
- Closing: once confirmed, a question is archived and its outcome recorded as a fact on the node by the reflect step.

## Facts & Details
- Recommended-first ordering was chosen over a separate recommended marker so a question reads naturally as plain text and one fewer thing can disagree with the list.
- Questions with no options are valid; they signal that research or a human is needed and are never auto-answered.
- A question is the only way to pause a todo on a decision: the todo is tagged with the question's number and resumes when the question stops being open.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) lint check for degenerate MCQ options (duplicate option text, or a question with only one `- O:` line)

## Children
