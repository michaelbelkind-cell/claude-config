# Command: /start-task

## Usage
/start-task GLBE-123

## Description
This command is the MANDATORY entry point for ALL development work.
You are STRICTLY FORBIDDEN from writing any code or making any changes
until this command completes all steps in exact sequential order.
This is NON-NEGOTIABLE. Zero exceptions.

---

## CRITICAL PROTOCOL: MANDATORY START TASK SEQUENCE

### Step 1 — Fetch Jira Ticket (PREREQUISITE)
- Open the ticket: https://returngo.atlassian.net/browse/$ARGUMENTS
- Extract and display to user:
  - Ticket ID
  - Title
  - Description
  - Type: Bug / Feature / Task / Chore
  - Priority
  - Status
- Ask user: "Is this the correct ticket? (yes/no)"
- It is STRICTLY PROHIBITED to continue if user says no

### Step 2 — Select Repo (MANDATORY)
- Ask the user: "Which repo does this ticket relate to?"
  - automation
  - portal-v2
  - portal-v2-bff
  - rms-client
  - shopify-app
- It is STRICTLY PROHIBITED to assume the repo

### Step 3 — Git Checks (MANDATORY PREREQUISITE)
- cd into the selected repo
- Run `git status` — repo MUST be 100% clean
  - If not clean: STOP and report to user — STRICTLY FORBIDDEN to continue
- Run `git checkout develop`
- Run `git pull` — MANDATORY to get latest code
- Confirm out loud: "You are on branch: develop, fully up to date"

### Step 4 — Create Branch (MANDATORY)
- Auto-generate branch name based on ticket type:
  - Bug     → fix/GLBE-XXX-short-description
  - Feature → feature/GLBE-XXX-short-description
  - Task    → chore/GLBE-XXX-short-description
  - Hotfix  → hotfix/GLBE-XXX-short-description
- Short description: lowercase, hyphens only, max 5 words from ticket title
- Show branch name to user and ask: "Create this branch? (yes/no)"
- Run `git checkout -b [branch-name]`
- Confirm out loud: "Branch created: [branch-name]"

### Step 5 — Load Repo Context (MANDATORY)
- Load the skill file for the selected repo from:
  per-repo/[repo-name]/CLAUDE.md
- Confirm to user: "Loaded context for [repo-name]"

### Step 6 — Confirm and Begin (MANDATORY FINAL STEP)
- Display full summary to user:
  Ticket:   $ARGUMENTS — [ticket title]
  Repo:     [repo-name]
  Branch:   [branch-name]
  Status:   clean and up to date
  Context:  loaded
- Ask: "Ready to start? Describe what you want to do first."
- You are STRICTLY FORBIDDEN from writing any code until user responds

---

## Strictly Prohibited
- STRICTLY PROHIBITED to skip any step
- STRICTLY PROHIBITED to assume ticket details without fetching from Jira
- STRICTLY PROHIBITED to work on main or develop directly
- STRICTLY PROHIBITED to start coding before Step 6 is confirmed by user
