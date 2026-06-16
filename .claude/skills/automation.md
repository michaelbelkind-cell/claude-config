# Skill: Automation Repo

## Identity & Context
- This repo contains end-to-end automation test scenarios
- Built with **pytest** as the test framework
- Connects to external APIs only — NO direct database access
- Part of the RGO/Global-E ecosystem

---

## CRITICAL PROTOCOL: MANDATORY BEFORE RUNNING ANY TEST

You are STRICTLY FORBIDDEN from running any test or making any changes until:

1. Confirm you are inside the `automation` repo — MANDATORY PREREQUISITE
2. Run `git status` — repo MUST be 100% clean
3. Run `git pull` — MANDATORY to get latest test scenarios
4. Confirm which environment to run against: `staging` or `production`
   - It is STRICTLY PROHIBITED to run tests against production without explicit user confirmation
5. Confirm which test scenario or suite to run — NEVER assume

---

## Folder Structure
> To be filled in after reviewing the automation repo structure with the team

---

## Running Tests

### Run a single test
```bash
pytest tests/test_file.py::test_function_name -v
```

### Run a full suite
```bash
pytest tests/ -v
```

### Run with specific markers
```bash
pytest -m "marker_name" -v
```

---

## CRITICAL PROTOCOL: TEST WRITING RULES

- Every test MUST be independent — no test should depend on another
- Test naming is MANDATORY: `test_[what_it_tests]` (e.g. `test_return_flow_success`)
- Each test MUST have a clear docstring explaining:
  - What it tests
  - Which API it calls
  - Expected outcome
- It is STRICTLY PROHIBITED to hardcode credentials or API keys in test files
- All sensitive config MUST go in environment variables or a `.env` file
- `.env` files are STRICTLY PROHIBITED from being committed to git

---

## External API Rules

- It is MANDATORY to confirm the target environment before calling any API
- It is STRICTLY PROHIBITED to call production APIs without explicit user approval
- All API calls MUST be logged for debugging
- If an API call fails — STOP and report to user before retrying

---

## Before Committing Test Changes

1. Run the full test suite — MANDATORY
2. All existing tests MUST still pass — no regressions allowed
3. New tests MUST be reviewed before merging
4. Commit message format: `test: description` (e.g. `test: add return flow scenario`)

---

## Notes
> API endpoints, credentials format, and service names to be added
> after review with the automation team
