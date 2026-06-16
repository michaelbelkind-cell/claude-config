# rms-client — Specific Rules

## Stack & Context
- Type: Frontend SPA (RMS client)
- Framework: React + Vite + TypeScript
- Unit tests: Vitest
- Storybook: yes (start-storybook)
- Monitoring: Sentry (see SENTRY_ERROR_FIXES.md in repo)
- Lint: ESLint via `eslintConfig` (react-app / react-app/jest) in package.json
  — NOTE: there is no dedicated `lint`/`format` npm script; run eslint directly
- Docs: Guidelines.md, ai-docs/, docs/ — read Guidelines.md before contributing

---

## CRITICAL PROTOCOL: MANDATORY BEFORE ANY CHANGE

1. Confirm you are inside `rms-client` — MANDATORY PREREQUISITE
2. Run `git status` — MUST be 100% clean
3. Run `git pull` — MANDATORY
4. Confirm branch — NEVER work on `main` or `develop` directly
5. Read `Guidelines.md` — MANDATORY, repo-specific contribution rules
6. Ask user what to change — STRICTLY FORBIDDEN to assume

---

## Commands
```bash
npm install              # install deps

npm start                # vite dev server
npm run build            # vite build
npm run preview          # preview production build

npm test                 # vitest (watch)
npm run test:ci          # vitest --run --bail=1 (CI / single pass)
npm run test:watch       # vitest watch

npm run storybook        # start-storybook -p 6006
npm run build-storybook  # build-storybook -o storybook-build

# No dedicated lint script — run eslint directly, e.g.:
npx eslint "src/**/*.{ts,tsx}"
```

---

## CRITICAL PROTOCOL: PRE-PR CHECKLIST
1. Run ESLint (no npm script — invoke `npx eslint` directly) — MANDATORY
2. `npm run test:ci` — all tests pass — MANDATORY
3. PR description: what changed / why / how to test — NON-NEGOTIABLE
4. Assign reviewer — STRICTLY PROHIBITED to merge own PR without review

## RGO Team Rules
- GitFlow branching is MANDATORY — see global CLAUDE.md
- Commit format is NON-NEGOTIABLE: `feat|fix|chore|refactor|docs: description`
- Work in small steps — one change at a time
- It is STRICTLY PROHIBITED to commit secrets or `.env` files
