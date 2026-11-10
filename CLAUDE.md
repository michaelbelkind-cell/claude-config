# RGO Claude Config — Global Rules

## Identity & Context
- You are a coding assistant working within the ReturnGo (RGO) development team
- RGO is part of the Global-E ecosystem
- Active repos: automation, portal-v2, portal-v2-bff, rms-client, shopify-app
- Current focus: automation repo

---

## CRITICAL PROTOCOL: MANDATORY PRE-TASK SEQUENCE

You are STRICTLY FORBIDDEN from writing any code, executing any task, or making
any changes until all 6 steps below are completed in exact sequential order.
This is NON-NEGOTIABLE. Zero exceptions.

1. Ask the user which repo they want to work on
2. `cd` into that specific repo — this is a PREREQUISITE for all following steps
3. Run `git status` — you MUST confirm the repository is 100% clean before proceeding
4. Run `git pull` — MANDATORY to fetch the latest code
5. Confirm the current branch out loud: "You are on branch: [branch-name]"
6. Ask the user what task they want to do — you are STRICTLY FORBIDDEN from
   assuming the task

---

## CRITICAL PROTOCOL: GIT BRANCHING RULES (GitFlow)

### Branch Structure
- `main` — production only
- `develop` — integration branch
- `feature/xxx` — new features (e.g. feature/add-return-flow)
- `fix/xxx` — bug fixes (e.g. fix/order-sync-issue)
- `hotfix/xxx` — urgent production fixes only

### Dedicated feature branches (MANDATORY)
- Every new feature starts on its own dedicated branch, created from the LATEST `dev`:
  `git fetch origin` then `git checkout -b feature/<name> origin/dev` — never from an old local copy, never from another feature branch.
- All work for that feature happens on its dedicated branch. Each change is a short-lived branch cut from the dedicated branch, with its PR into the dedicated branch — never into `dev`.
- The dedicated branch is merged into `dev` once, only when the user says the feature is ready.
- Syncing `dev` into a dedicated branch, and merging a PR into a dedicated branch, MUST use a merge commit ("Create a merge commit"), never squash — a squash drops the history link and the later merge into `dev` can lose files.

### Active dedicated branches
| Repo | Branch | Feature | Rule |
|---|---|---|---|
| automation | `feature/automation-coverage` | `/automation-coverage` skill and `coverage-gaps/` (coverage list, dashboard, roadmaps) | Work ONLY on this branch until the user says it is ready for `dev`. `coverage-gaps/` is not on `dev`; do not add it there. Before syncing with `dev` or merging into `dev`, follow `coverage-gaps/README.md` (merge `dev`, `git checkout HEAD -- coverage-gaps`, commit). |

### Strictly Prohibited
- It is STRICTLY PROHIBITED to commit directly to `main` or `develop`
- It is STRICTLY PROHIBITED to start a new feature on `dev` or on an existing branch — create its dedicated branch from the latest `dev` first
- It is STRICTLY PROHIBITED to force push to any branch
- It is STRICTLY PROHIBITED to merge your own PR without review
- It is STRICTLY PROHIBITED to work on multiple repos in the same session

### Mandatory Git Rules
- You MUST create a new branch before writing any code
- Branch naming is MANDATORY: lowercase, hyphens only, no spaces
- Commit message format is NON-NEGOTIABLE: `type: short description`
  - Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`
  - Example: `feat: add return status webhook handler`
- Opening a PR before merging is MANDATORY — zero exceptions

---

## CRITICAL PROTOCOL: WORKING RULES

- Working in small steps is MANDATORY — one change at a time
- After each step you MUST stop and confirm with the user before continuing
- It is STRICTLY PROHIBITED to run destructive commands (delete, reset,
  force push) without explicit user confirmation typed in this session
- It is STRICTLY PROHIBITED to assume what the user wants — always ASK
- You MUST explain what you are about to do before doing it
- If uncertain about anything — asking the user is MANDATORY

---

## CRITICAL PROTOCOL: MANDATORY PRE-PR CHECKLIST

You are STRICTLY FORBIDDEN from opening a PR until all steps below are completed:

1. Run linter — MANDATORY, all errors must be resolved
2. Run all tests — MANDATORY, all tests must pass
3. Write PR description — NON-NEGOTIABLE, must include:
   - What changed
   - Why it changed
   - How to test it
4. Assign reviewer — MANDATORY, you MUST NOT merge without approval

---

## Code Style
> PREREQUISITE: Must be confirmed with the team before enforcing.
> Will be added per repo under per-repo/[repo-name]/CLAUDE.md

---

## Current Focus
- Primary repo this week: `automation`
- Next week: fixes across all repos
- Switching repos mid-session is STRICTLY PROHIBITED without user confirmation
