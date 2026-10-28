---
name: gripper
status: done
parent: robot-arm
tests: pytest tests/test_gripper.py
last_verified: 2026-10-20
---
# gripper

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
Two-finger parallel gripper with force feedback. The arm needs a reliable way to hold objects without crushing them, so grip force is limited by a current threshold and reported to the planner. Without it, pick and place would drop or damage items, so every pick step depends on this node.

## Methodology

## Acceptance Tests
`pytest tests/test_gripper.py` passes: gripper closes on a 50 g block, holds it for 5 seconds without slip, and releases on command. Force reading stays below the configured limit.

## Todos

## Questions
- [x] Q1: Which serial protocol does the gripper speak?
  - A: Modbus RTU at 115200 baud.

## Implemented
- Open/close commands over serial with 2 ms response.
- Current-based force limit, configurable per object.
- Slip detection from force drop, raises a `GripLost` event.

## Facts & Details

## Citations
- [Parallel gripper design notes](https://example.com/gripper-notes)

## Archived

## Children
