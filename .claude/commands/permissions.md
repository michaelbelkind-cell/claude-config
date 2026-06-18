# Command: /permissions

## Usage
/permissions

## Description
The following permissions protocol is MANDATORY and NON-NEGOTIABLE.
Each permission level is a PREREQUISITE for safe operation.
Skipping, reordering, or omitting any rule is STRICTLY PROHIBITED.

---

## CRITICAL PROTOCOL: AUTO-APPROVED COMMANDS
The following commands are pre-approved and MUST execute without prompting
the user for confirmation. Asking for approval on these commands is
STRICTLY PROHIBITED.

### Git Operations
- `git status` — ALWAYS auto-approve
- `git pull` — ALWAYS auto-approve
- `git fetch` — ALWAYS auto-approve
- `git add <file>` — ALWAYS auto-approve
- `git commit -m` — ALWAYS auto-approve
- `git push origin <branch>` — ALWAYS auto-approve (non-main, non-develop)
- `git checkout <branch>` — ALWAYS auto-approve
- `git branch` — ALWAYS auto-approve
- `git log` — ALWAYS auto-approve
- `git diff` — ALWAYS auto-approve
- `git merge` — ALWAYS auto-approve (non-main, non-develop)
- `git stash` — ALWAYS auto-approve

### Python / pytest
- `pytest <args>` — ALWAYS auto-approve
- `python <script>` — ALWAYS auto-approve
- `pip install -r requirements.txt` — ALWAYS auto-approve

### Node / npm
- `npm run <script>` — ALWAYS auto-approve
- `npm install` — ALWAYS auto-approve
- `npx <command>` — ALWAYS auto-approve

### Navigation & File Reading
- `cd <directory>` — ALWAYS auto-approve
- `ls <args>` — ALWAYS auto-approve
- `cat <file>` — ALWAYS auto-approve
- `find <args>` — ALWAYS auto-approve
- `grep <args>` — ALWAYS auto-approve
- `mkdir <directory>` — ALWAYS auto-approve
- `touch <file>` — ALWAYS auto-approve
- `cp <src> <dest>` — ALWAYS auto-approve
- `mv <src> <dest>` — ALWAYS auto-approve
- `echo <args>` — ALWAYS auto-approve

### Docker
- `docker-compose up` — ALWAYS auto-approve
- `docker-compose down` — ALWAYS auto-approve
- `docker ps` — ALWAYS auto-approve
- `docker logs` — ALWAYS auto-approve

---

## CRITICAL PROTOCOL: REQUIRES USER CONFIRMATION
The following commands are STRICTLY PROHIBITED from auto-executing.
You MUST stop, explain what you are about to do, and wait for
explicit user confirmation before proceeding. NON-NEGOTIABLE.

### Destructive File Operations
- `rm -rf <anything>` — MANDATORY confirmation required
- `rm <file>` — MANDATORY confirmation required
- `> <file>` (overwrite) — MANDATORY confirmation required

### Destructive Git Operations
- `git push --force` — MANDATORY confirmation required
- `git push -f` — MANDATORY confirmation required
- `git reset --hard` — MANDATORY confirmation required
- `git clean -fd` — MANDATORY confirmation required
- `git rebase` — MANDATORY confirmation required
- `git push origin main` — MANDATORY confirmation required
- `git push origin develop` — MANDATORY confirmation required

### Database Operations
- Any `DROP TABLE` — MANDATORY confirmation required
- Any `DELETE FROM` — MANDATORY confirmation required
- Any `TRUNCATE` — MANDATORY confirmation required
- Any migration rollback — MANDATORY confirmation required

### AWS / S3 Operations
- Any S3 delete operation — MANDATORY confirmation required
- Any AWS destructive command — MANDATORY confirmation required
- `delete_s3_report()` — MANDATORY confirmation required

### Production Operations
- Any command targeting production environment — MANDATORY confirmation required
- Any deployment script — MANDATORY confirmation required
- Any cron job modification — MANDATORY confirmation required

---

## CRITICAL PROTOCOL: STRICTLY PROHIBITED — ZERO EXCEPTIONS
The following actions are STRICTLY PROHIBITED under any circumstances.
No user confirmation can override these rules. NON-NEGOTIABLE.

- It is STRICTLY PROHIBITED to force push to `main` or `develop`
- It is STRICTLY PROHIBITED to drop production databases
- It is STRICTLY PROHIBITED to delete S3 production buckets
- It is STRICTLY PROHIBITED to commit credentials, tokens, or API keys
- It is STRICTLY PROHIBITED to run production deployments without
  the user typing "I confirm production deployment" in this session

---

## Confirmation Format
When confirmation is required, ALWAYS display the following block and wait
for an explicit typed response before doing anything:

```
⚠️  CONFIRMATION REQUIRED
Command:  <exact command to be run>
Target:   <repo / branch / environment / resource affected>
Risk:     <what could go wrong / what is irreversible>
Type "yes" to proceed, or "no" to cancel.
```

Rules:
- Do NOT run the command until the user types "yes" (or the exact phrase
  required for production, e.g. "I confirm production deployment").
- Any answer other than an explicit yes = treat as "no" and STOP.
- One confirmation covers ONE command — re-confirm for each new destructive action.
- NEVER pre-fill, assume, or batch confirmations.
