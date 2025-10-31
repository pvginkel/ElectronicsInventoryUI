# Plan Execution Workflow

This document describes the workflow for executing a reviewed plan. The orchestrating agent oversees the complete execution of the plan and ensures a quality end result.

**Hard guardrails:**

- Agents must be used for significant code changes and to perform code review. You can make minor code changes yourself if you're confident to do so.
- Usage of agents is limited to only the agents listed below. You may not make use of other agents at all:
  - `code-writer`
  - `code-reviewer`

## Overview

When a user provides the location of a reviewed plan, the orchestrating agent is responsible for:

1. Delegating code implementation to the code-writer agent
2. Coordinating comprehensive code reviews through the code-reviewer agent
3. Resolving identified issues
4. Ensuring quality delivery before completion
5. Creating a comprehensive plan execution report

## Output Artifacts

The workflow produces these artifacts in the same folder as the plan:

- `plan.md` — The feature plan (provided by user)
- `code_review.md` — Comprehensive code review findings
- `plan_execution_report.md` — Final execution summary (required)

## Workflow Steps

### Step 1: Code Implementation

Use the **code-writer agent** to implement the plan:

```
Launch the code-writer agent with the plan location and full context.
```

**If the agent does not complete the plan in full**, provide assistance in one of the following forms:

- **Encourage progress**: Prompt the agent to proceed to the next slice or complete the current work at hand.

- **Perform partial review**: Conduct a spot check to gain confidence in the direction taken by the agent:
  - Run relevant tests
  - Review code quality and adherence to patterns
  - Feed conclusions back to the agent
  - Request the agent to continue

- **Request self-testing**: Ask the agent to test its own code before handing results back.

### Step 2: Verification Checkpoint (After Code-Writer)

Before proceeding to code review:

- [ ] Run `pnpm check` to verify TypeScript/lint pass
- [ ] Run affected test suites to verify no regressions
- [ ] Review git diff for unexpected changes
- [ ] Verify new test specs were created as required by plan

### Step 3: Code Review

Use the **code-reviewer agent** to perform a comprehensive review:

1. **Initiate review**:
   - Provide the full path to the plan
   - Specify the review output location: `code_review.md` in the same folder as the plan
   - If `code_review.md` already exists, delete it first before requesting the review
   - Instruct the agent to review **unstaged changes**

2. **Review the generated document**:
   - Read through all findings, questions, and recommendations
   - Answer any questions you can address with reasonable confidence:
     - For UX questions: Review the codebase for established UI patterns
     - For code pattern questions: Search for similar implementations in the project
     - Document your answers based on discovered patterns
   - Only defer to the user if you cannot answer with reasonable confidence

3. **Resolve identified issues**:
   - **Important**: Even if the code reviewer gives a GO, resolve ALL issues (including minor ones) identified in the review document. Do not defer this work to a later iteration.
   - A GO decision means there are no BLOCKER or MAJOR issues, but MINOR issues may still be present and should be fixed
   - Ask the same code-reviewer agent to resolve the issues found during review
   - Provide clear context about which issues need resolution

4. **Verification checkpoint (After Fixes)**:
   - [ ] Run `pnpm check` again
   - [ ] Run ALL affected test suites (including new ones)
   - [ ] Verify fixes address the specific review findings
   - [ ] Run full test suite if time permits

5. **Iterate if needed**:
   - If you lack confidence in the end result, request a new code review from a fresh code-reviewer agent
   - Place subsequent reviews at new locations: `code_review_2.md`, `code_review_3.md`, etc.
   - Repeat the review and resolution steps until quality standards are met

### Step 4: Plan Execution Report

**Required**: Create a comprehensive `plan_execution_report.md` document in the same folder as the plan.

The report MUST include:

1. **Status**:
   - One of: `DONE`, `DONE-WITH-CONDITIONS`, `INCOMPLETE`, or `ABORTED`
   - Example: `Status: DONE, the plan was implemented successfully` or `Status: DONE-WITH-CONDITIONS, there is minor work still to be completed`

2. **Summary**:
   - Overview of what was accomplished
   - Highlight any outstanding work needed
   - Example: "All slices implemented and tested. All critical bugs were resolved. Some minor questions remain unanswered. Ready for production deployment but follow-up is advised."

3. **Code Review Summary**:
   - Overview of review findings (BLOCKER, MAJOR, MINOR counts)
   - Which issues were resolved
   - Which issues were accepted as-is with rationale

4. **Verification Results**:
   - Output of `pnpm check`
   - Test suite results (pass/fail counts)
   - Any manual testing performed

5. **Outstanding Work & Suggested Improvements** (required section):
   - Any MINOR issues not fixed with rationale
   - Suggested follow-up improvements
   - Known limitations
   - Future enhancement opportunities
   - If nothing outstanding, explicitly state: "No outstanding work required."

## Quality Standards

Before considering the work complete:

- All plan requirements are implemented
- Code review has been completed with decision GO or GO-WITH-CONDITIONS
- ALL issues identified in code review are resolved (BLOCKER, MAJOR, and MINOR)
- `pnpm check` passes with no errors
- All affected tests are passing
- Tests that fail as a side effect of the work are fixed
- New test specs created as required by plan
- Code follows established project patterns
- No outstanding questions remain (or are deferred to user with clear context)
- **Plan execution report is written** (required)

## Example Workflow

```
1. User: "Execute the plan at docs/features/shopping-cart/plan.md"

2. Orchestrator: Launch code-writer agent with plan location
   → Agent implements features from plan

3. Orchestrator: Verification checkpoint
   → Run `pnpm check`
   → Run affected test suites
   → Review git diff

4. Orchestrator: Delete existing code_review.md if present

5. Orchestrator: Launch code-reviewer agent
   → Specify plan path: docs/features/shopping-cart/plan.md
   → Specify review output: docs/features/shopping-cart/code_review.md
   → Request review of unstaged changes

6. Orchestrator: Review the code_review.md document
   → Answer questions about UI patterns by searching codebase
   → Answer questions about data handling by finding similar implementations

7. Orchestrator: Request code-reviewer agent to resolve ALL identified issues
   → Provide context about specific issues to fix (including minor ones)

8. Orchestrator: Verification checkpoint (after fixes)
   → Run `pnpm check` again
   → Run ALL affected test suites
   → Verify fixes address review findings

9. Orchestrator: If confident, create plan_execution_report.md
   → Include status, summary, what was implemented, files changed
   → Document verification results
   → List any outstanding work or suggestions
   → Provide next steps for user

10. Orchestrator: Mark work complete
    → If not confident after 3 iterations, escalate to user
```

## Tips for Effective Orchestration

- **Be proactive**: Don't wait for agents to get stuck; monitor progress and intervene early
- **Leverage the codebase**: Most questions can be answered by examining existing patterns
- **Iterate without hesitation**: Multiple review cycles are acceptable to ensure quality
- **Clear communication**: Provide specific, actionable feedback to agents
- **Verify completion**: Run tests and checks before considering the work done
