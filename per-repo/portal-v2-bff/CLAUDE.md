# portal-v2-bff — Specific Rules

## Stack & Context
- Type: Backend-for-Frontend (BFF) for portal-v2
- Framework: NestJS v11 + TypeScript (nest-cli.json)
- HTTP: @nestjs/axios / axios
- Config: @nestjs/config
- Health: @nestjs/terminus
- Monitoring: Sentry (@sentry/nestjs, @sentry/profiling-node)
- Tests: Jest (unit) + Jest e2e (test/jest-e2e.json)
- Lint: ESLint (eslint.config.mjs) — Format: Prettier
- Git hooks: simple-git-hooks
- Note: repo contains npm-audit artifacts (audit*.json) — security-fix history

---

## CRITICAL PROTOCOL: MANDATORY BEFORE ANY CHANGE

1. Confirm you are inside `portal-v2-bff` — MANDATORY PREREQUISITE
2. Run `git status` — MUST be 100% clean
3. Run `git pull` — MANDATORY
4. Confirm branch — NEVER work on `main` or `develop` directly
5. Ask user what to change — STRICTLY FORBIDDEN to assume

---

## Commands
```bash
npm install              # install deps

npm run start            # nest start
npm run start:dev        # nest start --watch (swc, type-check)
npm run start:debug      # nest start --debug --watch
npm run start:prod       # node dist/main
npm run build            # nest build

npm run lint             # eslint (with --fix)
npm run format           # prettier --write

npm test                 # jest (unit)
npm run test:watch       # jest --watch
npm run test:cov         # jest --coverage
npm run test:e2e         # jest --config ./test/jest-e2e.json
```

---

## CRITICAL PROTOCOL: PRE-PR CHECKLIST
1. `npm run lint` — all errors resolved — MANDATORY
2. `npm test` and `npm run test:e2e` — all pass — MANDATORY
3. PR description: what changed / why / how to test — NON-NEGOTIABLE
4. Assign reviewer — STRICTLY PROHIBITED to merge own PR without review

## CRITICAL PROTOCOL: BFF / SECURITY RULES
- As a BFF, this service brokers credentials/tokens — it is STRICTLY PROHIBITED
  to log, print, or commit any secret, token, or API key
- All config MUST come from environment variables (@nestjs/config) — never hardcoded
- Run `npm audit` after dependency changes; do not introduce new high/critical advisories

## RGO Team Rules
- GitFlow branching is MANDATORY — see global CLAUDE.md
- Commit format is NON-NEGOTIABLE: `feat|fix|chore|refactor|docs: description`
- Work in small steps — one change at a time
