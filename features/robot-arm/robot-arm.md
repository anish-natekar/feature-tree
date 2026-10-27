---
name: robot-arm
status: in-progress
parent:
tests: pytest tests/test_robot_arm.py
last_verified:
---
# robot-arm

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Citations](#citations) · [Children](#children)

## Abstract
Six-axis desktop robot arm that picks and places small objects. It exists to give the project one controllable hardware target: every lower feature (gripping, motion planning, calibration) serves the single goal of moving an object from point A to point B reliably. Sample node, replace with real project features.

## Acceptance Tests
`pytest tests/test_robot_arm.py` passes: arm picks a 50 g block from marker A and places it within 5 mm of marker B in 10 consecutive runs.

## Todos
- [ ] (P1) define hardware interface contract between planner and motor driver
- [ ] (P?) decide power supply rating for six motors
- [ ] (P3) add emergency stop button wiring doc

## Questions

## Implemented

## Citations
- [ROS MoveIt docs](https://moveit.ros.org/)

## Children
- [[gripper]] (done)
- [[motion-planning]] (planned)
