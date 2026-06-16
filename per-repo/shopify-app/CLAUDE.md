# shopify-app — RGO Team Rules

## IMPORTANT
This file adds RGO team-level rules ON TOP of the existing repo CLAUDE.md.
You MUST read the repo's own CLAUDE.md first — it contains the full
architecture, commands, and patterns for this repo.

Location: shopify-app/CLAUDE.md (262 lines)

---

## CRITICAL PROTOCOL: MANDATORY BEFORE ANY CHANGE

1. Confirm you are inside `shopify-app` — MANDATORY PREREQUISITE
2. Read `shopify-app/CLAUDE.md` — MANDATORY, covers architecture and commands
3. Run `git status` — MUST be 100% clean
4. Run `git pull` — MANDATORY
5. Confirm branch — NEVER work on main or develop directly
6. Ask user what to change — STRICTLY FORBIDDEN to assume

---

## RGO Team Rules (supplement to repo CLAUDE.md)

- GitFlow branching is MANDATORY — see global CLAUDE.md
- Commit format is NON-NEGOTIABLE: `feat|fix|chore|refactor|docs: description`
- It is STRICTLY PROHIBITED to merge your own PR without review
- It is STRICTLY PROHIBITED to modify multi-schema DB without user confirmation
- It is STRICTLY PROHIBITED to deploy without running pre-deployment scripts
- Work in small steps — one change at a time — NON-NEGOTIABLE
