# Command: /review

## Usage
/review

## Description
MANDATORY pre-PR checklist. You are STRICTLY FORBIDDEN from opening
a PR until all steps below are completed and confirmed.
NON-NEGOTIABLE. Zero exceptions.

---

## CRITICAL PROTOCOL: MANDATORY PRE-PR SEQUENCE

### Step 1 — Code Review (PREREQUISITE)
- Summarize every file changed in this session
- Flag anything that looks risky or incomplete
- Ask user: "Are you happy with all changes? (yes/no)"
- STRICTLY PROHIBITED to continue if user says no

### Step 2 — Run Linter (MANDATORY)
Run the correct linter for the active repo:
- portal-v2:     `npm run lint`
- portal-v2-bff: `npm run lint`
- rms-client:    `npx eslint "src/**/*.{ts,tsx}"`
- shopify-app:   `./vendor/bin/tlint`
- automation:    no linter — skip this step

All errors MUST be fixed before continuing. Zero tolerance.

### Step 3 — Run Tests (MANDATORY)
Run the correct test command for the active repo:
- portal-v2:     `npm run test-once`
- portal-v2-bff: `npm run test`
- rms-client:    `npm run test:ci`
- shopify-app:   `php artisan test`
- automation:    `pytest tests/ -v`

All tests MUST pass. STRICTLY PROHIBITED to open PR with failing tests.

### Step 4 — Confirm Branch (MANDATORY)
- Run `git status` — confirm no uncommitted changes
- Confirm you are NOT on main or develop
- If on main or develop: STOP — STRICTLY PROHIBITED to PR from these branches

### Step 5 — Write PR Description (MANDATORY)
Generate a PR description with these sections — NON-NEGOTIABLE:

- **What changed** — a concise summary of the changes in this PR
- **Why it changed** — the reason / linked issue / business context
- **How to test it** — exact steps a reviewer can follow to verify
- **Risk & rollback** — known risks and how to revert if needed

Present the description to the user for approval before creating the PR.
STRICTLY PROHIBITED to open the PR until the user approves the description.

### Step 6 — Assign Reviewer (MANDATORY)
- Assign at least one reviewer — MANDATORY
- It is STRICTLY PROHIBITED to merge your own PR without review approval

---

## After the Checklist
Only once Steps 1–6 are complete and the user has approved:
- Open the PR (e.g. `gh pr create`) targeting the correct base branch
  (`develop` for features/fixes, never `main` directly)
- Report the PR URL back to the user
