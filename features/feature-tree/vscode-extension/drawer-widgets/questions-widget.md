---
name: questions-widget
status: done
parent: drawer-widgets
tests: npm test
last_verified: 2026-10-28
---
# questions-widget

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The question card shown in the drawer and the floating box, used by a human to answer questions that agents logged. It supports both a short list of concrete options and free-text answers, and it keeps blocked todos consistent when a question is resolved.

## Methodology
With options, the card shows a radio list. The first option is badged as recommended; this is display only and is never saved into the answer. An Other row is always appended and reveals a free-text answer box when picked. The saved answer looks the same whether the person picked a listed option or typed their own.

Without options, the card uses the plain free-text flow unchanged.

An answer given by a person is recorded as confirmed. An answer an agent gave after research stays marked as unconfirmed until the person confirms or reopens it from the card.

When a question is answered or removed, any todo blocked on it loses that blocked marker automatically, so no todo is left waiting on something already settled.

Why the first option is the recommendation: that is how agents already phrase multiple-choice questions, so no extra data is needed. Data kept: nothing beyond the question block in the node's own markdown.

## Acceptance Tests
`cd vscode-feature-tree && npm test` passes (relevant tests: "MCQ: ...", "questions: ...").

## Todos

## Questions

## Implemented
- Multiple-choice question card with recommended badge and Other row.
- Automatic removal of blocked markers when a question is resolved.

## Facts & Details
- Decision: the first option is the recommendation; nothing extra is stored.

## Citations
- [features/SCHEMA.md](../../../../SCHEMA.md)

## Archived

## Children
