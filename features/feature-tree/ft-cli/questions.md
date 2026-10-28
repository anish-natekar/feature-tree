---
name: questions
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.QuestionOptionTests
last_verified: 2026-10-28
---
# questions

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Questions are how an agent or planner records a decision it cannot make alone. A question may carry a short list of candidate answers, which makes it quick for a human to settle and lets an unattended agent adopt a safe default.

## Methodology
Asking takes a node and the question text, plus any number of candidate options. The tool appends a new open question using the next free number on that node. Numbers are per node and only grow, so they are never reused. Whitespace in the text and options is collapsed to single spaces.

Options sit as indented lines directly under the question. The first option is the recommended one and is displayed marked as such; a separate recommended marker was avoided so a question reads naturally as plain text and one fewer thing can disagree with the list. An Other choice is always offered by viewers implicitly and is never written down.

A question moves through three states: open, answered by an agent but not yet confirmed, and confirmed by a human. Listing shows open and agent-answered ones by default; flags narrow to open only or widen to everything. A question that blocks a still-open todo is tagged as blocking so urgent ones stand out. A todo pauses on a decision by being tagged with the question's number, and resumes as soon as that question stops being open.

Questions with no options are valid. They signal that research or a human is needed and are never auto-answered. The linter warns on a question with only one option, or with repeated option text, since a single option is not a choice.

Once confirmed, a question is archived and its outcome recorded as a fact on the node by the reflect step.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.QuestionOptionTests -v` passes (3 tests).

## Todos

## Questions

## Implemented
- Asking with automatic numbering and optional candidate options.
- Three states, filtered listing and a blocking tag.
- Linter warnings for degenerate option lists.

## Facts & Details
- A question is the only way to pause a todo on a decision.
- Open-ended questions never get an automatic answer.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P3) lint check for degenerate MCQ options (duplicate option text, or a question with only one `- O:` line)

## Children
