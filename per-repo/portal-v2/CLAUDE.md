# portal-v2 — Specific Rules

## Stack & Context
- Type: Frontend SPA
- Framework: React + Vite + TypeScript
- UI: Chakra UI (@chakra-ui/react v3)
- Forms: react-hook-form (@hookform/resolvers)
- Monitoring: Sentry (@sentry/react)
- Unit tests: Vitest
- E2E tests: Playwright (playwright.config.ts)
- Visual/Storybook: Storybook + Chromatic
- Lint: ESLint (flat config) — Format: Prettier
- Git hooks: simple-git-hooks + lint-staged

---

## CRITICAL PROTOCOL: MANDATORY BEFORE ANY CHANGE

1. Confirm you are inside `portal-v2` — MANDATORY PREREQUISITE
2. Run `git status` — MUST be 100% clean
3. Run `git pull` — MANDATORY
4. Confirm branch — NEVER work on `main` or `develop` directly
5. Ask user what to change — STRICTLY FORBIDDEN to assume

---

## Commands
```bash
npm install              # install deps

npm run dev              # vite dev server (--host)
npm run build            # tsc -b && vite build
npm run preview          # preview production build

npm run lint             # eslint (with --fix)
npm run format           # prettier --write

npm test                 # vitest (watch)
npm run test-once        # vitest run (CI / single pass)
npm run test:coverage    # vitest --ui --coverage

npm run storybook        # storybook dev -p 6006
npm run chromatic        # visual regression
```

---

## CRITICAL PROTOCOL: PRE-PR CHECKLIST
1. `npm run lint` — all errors resolved — MANDATORY
2. `npm run test-once` — all tests pass — MANDATORY
3. Run Playwright E2E for affected flows when relevant
4. PR description: what changed / why / how to test — NON-NEGOTIABLE
5. Assign reviewer — STRICTLY PROHIBITED to merge own PR without review

## RGO Team Rules
- GitFlow branching is MANDATORY — see global CLAUDE.md
- Commit format is NON-NEGOTIABLE: `feat|fix|chore|refactor|docs: description`
- Work in small steps — one change at a time
- It is STRICTLY PROHIBITED to commit secrets or `.env` files
