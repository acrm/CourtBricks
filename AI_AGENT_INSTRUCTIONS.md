# AI Agent Instructions

## Language Policy
- Chat/output to users: Russian.
- Any source code, scripts, configs, and documentation content: English.

## Version Policy
- Version format: `<weekCode>-<minor>.<build>`.
- Mandatory bump rule: after any tracked file change, you must run a version bump before commit.
- Use one of:
  - `npm run bump:build -- --desc "Short English summary"`
  - `npm run bump:minor -- --desc "Short English summary"`

## Version Metadata Synchronization
- Version metadata must stay synchronized in `version.json` and `package.json` (`version` field).
- Every bump appends one line to `build-notes.md`.
- Notes line format: `- <version> — <description>`.

## Commit Message Policy
- Commit message format is mandatory: `<version>: <description>`.

## Standard Git Workflow
1. Apply changes.
2. Run bump command.
3. Run verification commands.
4. Commit with required message format.

## Documentation Synchronization Contract
- After any source change, review and update domain docs if impacted.
- If behavior, parameters, UI, or flows changed, update docs in the same task.
