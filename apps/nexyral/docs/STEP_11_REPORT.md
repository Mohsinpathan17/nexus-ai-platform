# Step 11: consistent workspace backup and guarded recovery

Added `server/backups.ts`, `server/backups.test.ts`,
`scripts/database-maintenance.ts`, `docs/RECOVERY.md`, and this report.
Modified `package.json` to add `db:maintenance`. No new dependencies.

SQLite online backups preserve committed WAL changes while services stay open.
Unique private directories contain a standalone snapshot and SHA-256 manifest.
Integrity, foreign keys and schema are checked. Restore refuses existing paths,
validates the snapshot, revokes sessions and preview grants, removes worker
capabilities/leases, and fails interrupted running runs without automatic retry.
No source database or live service is replaced. Stored evidence remains intact.

Validation: both recovery tests passed, covering snapshot isolation after a
post-backup write, exact artifact preservation, owner/project preservation,
session/grant/worker revocation, interrupted-run handling, file permissions,
existing-path rejection and same-length tampering. The initial test selected
an arbitrary artifact instead of its fixture ID; the assertion was corrected
and rerun. No implementation check was relaxed.

Backup directories contain sensitive data and are not encrypted by this tool.
Manifests provide corruption detection, not authenticity. Automatic scheduling,
rotation, off-machine storage and encrypted recovery are not implemented.
Next: service orchestration and lifecycle safeguards, then account recovery and
HTTPS backend deployment preparation. Public workspace services remain local;
the existing Vercel public website demo is unchanged.

Final checks: `node --test server/backups.test.ts` ran two tests, both passed.
`npm run lint`, `npm run typecheck`, and `npm run build` passed. A separate CLI
smoke created a temporary empty v4 database, executed `db:maintenance backup`
and `restore` through actual npm commands, verified success, and removed only
its own scratch directory. Existing workspace databases were untouched.
The inherited 3D chunk-size advisory and Playwright color-environment warnings
remain; no new application warnings were observed. Updated cloud startup
instructions were saved as a draft, not published.
