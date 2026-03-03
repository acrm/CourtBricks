# Repository Agent Workflow Alignment — Execution Prompt

Use this document as an executable task description for the coding agent.

## Mission

Bring this repository to full compliance with a strict AI-agent workflow model that includes:

- deterministic agent instructions,
- mandatory version bump after any tracked file change,
- build notes tracking,
- standardized commit message format with version prefix,
- explicit project documentation synchronization policy.

Perform all steps below end-to-end. Do not stop at analysis.

---

## Global Rules

1. Chat/output language for user communication: **Russian**.
2. File/code language: **English only**.
3. Keep changes minimal and targeted; do not add unrelated features.
4. If a required file already exists, update it to match the contract below.
5. If equivalent logic exists under different names/paths, either align it or replace with the contract structure.
6. After all edits and version bump are done, create a git commit immediately in the same task.

---

## Required Files and Exact Intent

### 1) `AI_AGENT_INSTRUCTIONS.md`

Create or update with these policy blocks:

- Language policy (chat Russian, files English).
- Version format: `<weekCode>-<minor>.<build>`.
- Mandatory bump rule after **any tracked file change**.
- Commands:
  - `npm run bump:build -- --desc "Short English summary"`
  - `npm run bump:minor -- --desc "Short English summary"`
- Explain that version metadata is synchronized in `version.json` and `package.json`, and notes appended to `build-notes.md`.
- Commit message format requirement: `<version>: <description>`.
- Standard git workflow sequence:
  1) apply changes,
  2) run bump,
  3) run verification,
  4) commit.

### 2) `.github/copilot-instructions.md`

Create or update with concise operational rules mirroring `AI_AGENT_INSTRUCTIONS.md` plus:

- “After any source change, review and update domain docs if impacted.”
- A `Key Documentation` section listing project-specific docs/modules the agent must consult.
- Development command list relevant to the repository (at minimum build/typecheck/test + bump commands).

### 3) `version.json`

Create if missing with this schema:

```json
{
  "weekCode": "2026w10",
  "minor": 0,
  "build": 1,
  "currentVersion": "2026w10-0.1"
}
```

If it exists, preserve continuity and schema consistency.

### 4) `build-notes.md`

Create if missing:

```md
# Build Notes

- 2026w10-0.1 — Initial snapshot version entry.
```

Ensure future bumps append lines in format:

`- <version> — <description>`

### 5) `scripts/update-version.js`

Create or update a Node.js script that:

- Supports args:
  - `--minor` (increment minor, reset build to 1)
  - `--desc "..."` (description for notes)
- On regular bump:
  - increments `build` by 1.
- On week rollover:
  - sets `weekCode` to current,
  - resets to `minor=0`, `build=1`.
- Updates:
  - `version.json`,
  - `package.json` field `version`,
  - appends to `build-notes.md`.
- If `--desc` omitted, tries to use last git commit message; fallback to default text.
- Prints the new version to stdout.

### 6) `package.json`

Ensure scripts exist (add if absent, preserve other scripts):

```json
{
  "scripts": {
    "bump:build": "node scripts/update-version.js",
    "bump:minor": "node scripts/update-version.js --minor"
  }
}
```

Do not remove existing scripts.

---

## Project Documentation Synchronization Contract

Create or update documentation policy in both instruction files:

- After code changes, check domain docs (game logic / business rules / architecture / roadmap equivalents).
- If behavior, parameters, UI, or flows changed, update docs in same task.

If repository has no such docs, create minimal placeholders:

- `docs/GAME_LOGIC.md` (or domain-equivalent name),
- `docs/TODO.md`.

Use concise, factual English content.

---

## Verification Steps (must execute)

Run what is available in this repository:

1. Version bump dry run equivalent by actually bumping once for the migration task:
   - `npm run bump:build -- --desc "Align repository with AI agent workflow"`
2. Type validation if available:
   - `npm run typecheck`
3. Tests if available:
   - `npm run test`
4. Build if available:
   - `npm run build`

If some commands are absent, skip gracefully and report which are unavailable.

---

## Completion Criteria

Task is complete only if all are true:

1. Instruction files are present and consistent.
2. Versioning files/scripts are present and wired.
3. `package.json` contains bump scripts.
4. A bump was executed successfully and propagated to all version artifacts.
5. Verification commands were run (or explicitly marked unavailable).
6. A git commit was created immediately after bump and verification using format `<version>: <description>`.
7. Final report includes:
   - changed files list,
   - resulting version,
   - executed checks and results,
   - any follow-up actions.

---

## Final Output Format Requirement

At the end, return a concise Russian report with sections:

- `Что сделано`
- `Какие файлы изменены`
- `Проверки`
- `Итоговая версия`
- `Риски / что осталось`

No long prose.
