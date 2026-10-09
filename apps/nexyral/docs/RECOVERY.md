# Workspace backup and recovery

These are trusted local operator commands, not public API endpoints. Run from
`apps/nexyral` with Node 24.19+. Backups contain password hashes, project/source
content and session records: keep them private. Local mode-700 directories and
mode-600 files provide filesystem access controls, not encryption. Protect and
copy backups off-machine separately; this implementation does not upload them.

Create a consistent SQLite online backup while services are running:

```sh
npm run db:maintenance -- backup
# Optional destination root:
npm run db:maintenance -- backup /protected/backup-directory
```

The command reads `NEXYRAL_DB_PATH` (default `.data/nexyral.sqlite`) and uses the
SQLite backup API to include committed WAL data. It creates a unique directory
with `database.sqlite` and `manifest.json`, validates supported schema v4/v5/v6/v7, SQLite integrity
and foreign keys, and records byte length and SHA-256. It never deletes older
backups. No automatic schedule or disk quota is implemented yet.

Restore to a **new** database path:

```sh
npm run db:maintenance -- restore .data/backups/backup-<id> .data/recovered.sqlite
```

Existing destination files are rejected. The command validates manifest,
checksum and database integrity, copies the snapshot, revokes recovery links, sessions and
preview grants, clears worker leases/capabilities, and marks interrupted running
runs failed with a recovery event. It preserves accounts, projects, stored
artifacts, approvals and verification. Users must sign in again. Completed runs
remain completed; pending intents and approved queues remain pending. No worker
starts automatically.

Before selecting the recovered database, stop the API, preview service and all
workers using the old path. Set the same `NEXYRAL_DB_PATH` for all services, then
restart the API and preview service. Inspect pending runs before starting a
worker, because it may consume queued work. Verify health, sign-in, ownership,
project evidence and source export before accepting traffic. Keep the old
database and its WAL together until recovery is accepted. This tool does not
switch live services, overwrite the old database, recover files outside SQLite,
or automatically roll back a deployment.

The manifest detects accidental corruption; it is not a signature. Treat the
backup directory and its manifest as trusted operator input. Off-machine
recovery, encryption, rotation, disaster-recovery objectives and scheduled
restore drills remain future operational work. The Vercel static demo has no
workspace database and is separate from these services.

Schema v6 adds project requirements. New backups include saved briefs and run
context snapshots; restore preserves them. Opening a v4/v5 restored database
upgrades additively to v6. Back up an existing workspace before upgrading, and
keep its original backup private rather than opening v6 with an older server.
