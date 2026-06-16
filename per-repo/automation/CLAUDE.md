# Automation Repo — Specific Rules

## Stack & Context
- Framework: pytest 7.2.0
- Parallel execution: pytest-xdist (default); `serial` marker for exceptions
- Reporting: pytest-html, allure-pytest (history + report published to S3)
- HTTP clients: requests, aiohttp
- AWS: boto3 — single bucket `s3-bucket-automation`
- Google API: google-api-python-client
- Database: mysql-connector-python — READ-ONLY queries only
- Payments: stripe
- Monitoring: sentry-sdk
- UI tests: Playwright (`tests/ui/`)
- BDD: Gherkin `.feature` files
- This repo tests external APIs — NO direct DB writes allowed
- Runs in Docker via `docker-compose.yml` / `docker-entrypoint.sh`
- ~666 Python files, ~503 under `tests/`
- `tests/zephyr/` is a self-contained sub-project with its own `pytest.ini` and `requirements.txt`

---

## Folder Structure

```
automation/
├── tests/                  # ~503 .py — the main suite
│   ├── APIs/               # Integrator/, PDF-MS/, Shipping/
│   ├── Rma/                # test_rma_info, test_rma_schema
│   ├── Rmas/               # cursor, customer_ids, num_rmas, order_name, sort_created, status
│   ├── comment/            # test_postComment
│   ├── emails/             # Klaviyo/ + email flow tests
│   ├── integration/        # largest area: return, exchange, eligible, taxation,
│   │                       # items, order_modification, return_method_new, etc.
│   ├── shipments/          # test_delete_shipmentid, test_update_shipment (own conftest)
│   ├── status/             # test_status_negative_cases
│   ├── ui/                 # Playwright: dashboard/, portal/ (own conftest + helper.py)
│   ├── webhooks/           # external/, internal/
│   ├── zephyr/             # nested sub-project (own pytest.ini + requirements.txt)
│   └── conftest.py         # main fixtures (~21 KB)
├── helpers/                # ~50 .py — incl. S3 handlers
│   └── handlers/           # ScreenshotHandler.py, allure_report_s3.py
├── services/               # ~28 .py — API service clients
├── model/                  # ~56 .py — data models
├── analytics/              # ~13 .py — report generation (ReportFilesHandler.py)
├── utils/                  # ~7 .py — shared utilities
├── custom_conftests/       # custom conftest variants
├── .github/                # CI workflows + scripts/monitor/
├── ai-docs/                # documentation
├── docker-compose.yml, Dockerfile, docker-entrypoint.sh
└── pytest.ini, requirements.txt
```

---

## Test Markers
Registered in `pytest.ini`:

- `incremental` — mark a test as incremental
- `serial` — run in serial instead of the default parallel execution
- `monitor` — mark a test as a monitor test

Platform markers (select the e-commerce platform a test targets):
- `shopify`, `magento`, `salesforce`, `custom`, `bigcommerce`, `woocommerce`, `wix`, `globale`

Use the appropriate platform marker on every platform-specific test; use `serial`
only when a test genuinely cannot run in parallel.

---

## Environment Variables
Defaults set via `pytest-env` in `pytest.ini` (the `D:` prefix means "set only if
not already defined", so real environments override them):

- `RUNENV=dev`
- `ENDPOINT_PDF=localhost`
- `ENDPOINT_SHIPPING=localhost`
- `DB_ENDPOINT=localhost`
- `ENDPOINT_INTEGRATOR=localhost`

AWS / Google / Stripe credentials come from environment variables only:
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (used by the S3 report handlers)

---

## CRITICAL PROTOCOL: MANDATORY BEFORE RUNNING ANY TEST

You are STRICTLY FORBIDDEN from running any test until all steps below
are completed in exact sequential order. NON-NEGOTIABLE. Zero exceptions.

1. Confirm you are inside the `automation` repo — MANDATORY PREREQUISITE
2. Run `git status` — repo MUST be 100% clean before proceeding
3. Run `git pull` — MANDATORY to get latest test scenarios
4. Confirm target environment with user — MANDATORY:
   - `staging` / `dev` — default, safe to run freely
   - `production` — STRICTLY PROHIBITED without explicit user confirmation
5. Confirm which test or suite to run — NEVER assume

---

## CRITICAL PROTOCOL: ENVIRONMENT RULES

- It is STRICTLY PROHIBITED to run tests against production without the user
  typing "I confirm production run" in this session
- Environment MUST be confirmed before any pytest command is executed
- All credentials and API keys MUST come from environment variables (or a local
  `.env` file) — never hardcoded
- It is STRICTLY PROHIBITED to commit `.env` files to git
- It is STRICTLY PROHIBITED to log or print any credentials, tokens, or API keys

---

## Running Tests

### Single test
```bash
pytest tests/path/test_file.py::test_function_name -v
```

### Full suite
```bash
pytest tests/ -v
```

### Parallel execution (default style)
```bash
pytest tests/ -n auto -v
```

### Serial-only tests
```bash
pytest tests/ -m serial -v
```

### By platform marker
```bash
pytest tests/ -m shopify -v
```

### With Allure reporting
```bash
pytest tests/ --alluredir=allure-results -v
allure serve allure-results
```

### With HTML report
```bash
pytest tests/ --html=report.html --self-contained-html -v
```

### Via Docker
```bash
docker-compose up --build
```

---

## CRITICAL PROTOCOL: TEST WRITING RULES

- Every test MUST be fully independent — no test may depend on another's state
- Test naming is MANDATORY: `test_[action]_[expected_result]`
  - Example: `test_create_return_success`
  - Example: `test_get_order_invalid_id_returns_404`
- Each test MUST have a docstring stating: what it tests, which API endpoint it
  calls, and the expected outcome
- It is STRICTLY PROHIBITED to use `time.sleep()` for waits — use `polling2`
  (the established pattern in this repo) instead
- All external API / S3 calls MUST be wrapped in try/except and logged
- Apply the correct platform marker(s) and `serial` only when truly required
- It is STRICTLY PROHIBITED to leave `print()` or debug code in committed tests

---

## CRITICAL PROTOCOL: DATABASE RULES

- mysql-connector-python is for READ-ONLY queries only
- It is STRICTLY PROHIBITED to run INSERT / UPDATE / DELETE / DDL against any
  database from tests

---

## CRITICAL PROTOCOL: AWS S3 RULES

- The repo uses a single bucket: `s3-bucket-automation`
- Report handlers (`allure_report_s3.py`) include a `delete_s3_report()` that
  removes objects under `<env>/<platform>/allure-report/` — it is STRICTLY
  PROHIBITED to invoke any S3 delete/overwrite path against a non-report prefix,
  or against production report data, without explicit user confirmation
- AWS credentials MUST come from environment variables only
- It is STRICTLY PROHIBITED to log or print AWS/Google credentials anywhere

---

## CRITICAL PROTOCOL: STRIPE RULES

- It is STRICTLY PROHIBITED to run Stripe tests against live/production keys
- Stripe test-mode keys MUST be used at all times
- Any Stripe production run requires the user to type "I confirm Stripe production"

---

## Before Committing Test Changes

1. Run the full affected test suite — MANDATORY
2. All existing tests MUST still pass — zero regressions allowed
3. Generate and review the Allure report when relevant
4. Commit message format is NON-NEGOTIABLE: `test: description`
   - Example: `test: add return creation flow for Shopify orders`
5. It is STRICTLY PROHIBITED to commit failing tests
6. Follow the repo-wide GitFlow rules (feature/fix branch + PR + review)
