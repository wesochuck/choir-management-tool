---
name: gsd
description: Get Shit Done (GSD) project management, phase planning, wave-based execution, spiking, scientific debugging, and milestone verification workflows. Optimized for highly structured, predictable agentic execution.
---

# GSD: Get Shit Done Workflow

GSD is an advanced, hierarchical workflow system optimized for autonomous and collaborative software engineering. It enforces strict separation of concerns between planning, execution, and verification.

---

## 1. Core Architecture

GSD coordinates all project development using a dedicated `.planning/` workspace folder, containing:

```
.planning/
├── PROJECT.md            # Vision, requirements, tech stack, and scope
├── REQUIREMENTS.md       # Scoped requirements mapped to REQ-IDs
├── ROADMAP.md            # Sequential phase breakdown mapped to REQ-IDs
├── STATE.md              # Live project status, milestones, metrics, and memory
├── RETROSPECTIVE.md      # Living record of post-milestone learnings
├── config.json           # Workflow configuration (interactive vs yolo mode, model profiles)
├── todos/                # Captured ideas and tasks (pending/ and done/)
├── spikes/               # Sandbox feasibility experiments and verdicts
├── sketches/             # Design mockup explorations and tabbed HTML variations
├── debug/                # Scientific debugging investigation logs (evidence -> hypothesis -> test)
└── phases/               # Phase plans (PLAN.md) and completed execution logs (SUMMARY.md)
```

---

## 2. Command Reference

All GSD operations are executed using standard commands:

### Project & Milestone Initialization
* **`/gsd:new-project`** — Initialize a fresh GSD project. Generates the baseline requirements, roadmap, state, and config after deep elicitation of objectives.
* **`/gsd:map-codebase`** — Map an existing repository prior to initialization. Explores conventions, architecture, dependencies, integrations, and tech debt.
* **`/gsd:new-milestone <name>`** — Start a new milestone in an existing project, outlining features, dependencies, and requirements.
* **`/gsd:complete-milestone <version>`** — Archive current milestone data, tag the Git release, and prepare the workspace for the next milestone.

### Phase Management
* **`/gsd:discuss-phase <phase>`** — Brainstorm user requirements and clear ambiguities for an upcoming phase before drafting a plan. Use `--batch` for efficiency.
* **`/gsd:plan-phase <phase>`** — Create a detailed plan file (`XX-YY-PLAN.md`) outlining tasks, required reading, interfaces, checkpoints, and acceptance criteria.
* **`/gsd:execute-phase <phase>`** — Systematically execute all plans within a phase. Coordinates wave-based executions.
* **`/gsd:verify-work <phase>`** — Run User Acceptance Testing (UAT) for all deliverables completed in the specified phase.

### Ad-Hoc Tasks & Router
* **`/gsd-do <description>`** — Natural language smart router. Dispatches your intent to the correct GSD command.
* **`/gsd:quick [--full] [--validate] [--discuss] [--research]`** — Execute small, ad-hoc tasks safely with planning and verification but without formal phase overhead.
* **`/gsd:fast "description"`** — Instantly execute trivial, low-risk changes (e.g. typos, simple config changes) inline with immediate git commits.

### Prototyping & Diagnostics
* **`/gsd:spike "concept" [--quick]`** — Run rapid, structured feasibility experiments using throwaway code inside `.planning/spikes/`. Answers explicit Given/When/Then questions.
* **`/gsd:sketch "concept" [--quick]`** — Rapidly prototype visual UI variations. Outputs tabbed, responsive HTML mockups under `.planning/sketches/`.
* **`/gsd-spike-wrap-up`** / **`/gsd-sketch-wrap-up`** — Curate spike/sketch outcomes, document design decisions, and package lessons into persistent skills under `./.gemini/skills/`.
* **`/gsd:debug "issue"`** — Conduct systematic debugging sessions using scientific inquiry (Symptoms -> Evidence -> Hypotheses -> Verification).

### Maintenance & Continuity
* **`/gsd:progress`** — Print a visual progress bar, metrics, current location, and recommend the next logical action.
* **`/gsd:resume-work`** — Resume context from the previous session using `.planning/STATE.md`.
* **`/gsd:pause-work`** — Gracefully pause a session, creating a `.continue-here` handoff log.
* **`/gsd:cleanup`** — Archive completed phase directories to reduce planning workspace clutter.
* **`/gsd:review --phase <phase> [--all]`** — Invoke cross-AI peer review from external engines to audit phase plans before execution.

---

## 3. The Execution Protocol (PLAN.md -> SUMMARY.md)

When executing any phase, you must follow the strict three-tier cycle:

### Tier A: Plan Validation & Read-First Gates
1. Before starting a plan, load `.planning/STATE.md` and the target `PLAN.md` file.
2. If a task contains a `<read_first>` element listing paths, you **must** read those files completely before making edits. Do not assume context.

### Tier B: Execution, TDD, and Verification Gates
1. Execute tasks sequentially or in parallel waves as defined by the plan.
2. For TDD tasks, enforce the Red-Green-Refactor loop:
   - **RED**: Write failing tests. Commit: `test(XX-YY): add failing test for [feature]`
   - **GREEN**: Implement minimal code to pass tests. Commit: `feat(XX-YY): implement [feature]`
   - **REFACTOR**: Optimize structure without breaking tests. Commit: `refactor(XX-YY): clean up [feature]`
3. **Acceptance Criteria Gate**: If a task has `<acceptance_criteria>`, you must run the verification commands, inspect outcomes, and verify they pass perfectly before declaring the task done.
4. **Authentication Gates**: If an authentication barrier (401/403/Expired Token) is hit:
   - Stop immediately.
   - Present a clear dynamic checkpoint explaining the login steps.
   - Wait for the user to complete the authentication before retrying the task.
5. If verification fails, run `node-repair` or escalate.

### Tier C: Completion & Summarization
1. Create the `SUMMARY.md` file using the standard GSD template.
2. Document all metrics, key files modified/created, key decisions, and any deviations.
3. Advance the roadmap/state progress counters.
4. Commit documentation changes:
   ```bash
   git add .planning/
   git commit -m "docs(XX-YY): complete [plan name] plan"
   ```
