---
name: motion-planning
status: planned
parent: robot-arm
tests: manual
last_verified:
---
# motion-planning

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Citations](#citations) · [Children](#children)

## Abstract
Computes collision-free joint trajectories from the current pose to a target pose. The arm needs this so it never hits the table or itself while moving between pick and place points. It consumes target poses from the robot-arm feature and outputs timed joint commands for the motor driver. Grasp poses must respect the opening limits of the [[gripper]], see the [MoveIt docs](https://moveit.ros.org/) for planner background.

## Acceptance Tests
Manual checklist: arm moves from home to marker A and back without touching the table; planner rejects an unreachable pose with a clear error.

## Todos
- [ ] (P0) choose planner library (MoveIt vs custom IK) {blocked: Q1}
- [ ] (P2) add joint velocity and acceleration limits config

## Questions
- [ ] Q1: Should we depend on MoveIt (ROS 2) or write our own IK, given the arm runs on a Raspberry Pi?

## Implemented

## Citations
- [MoveIt docs](https://moveit.ros.org/)

## Children
