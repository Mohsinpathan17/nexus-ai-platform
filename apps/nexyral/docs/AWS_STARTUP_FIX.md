# SQLite startup-lock repair

The first production cold start failed when the API read PRAGMA user_version
while the preview process was initializing the shared database. The connection
wait budget was previously applied only after that first read and WAL setup.

openDatabase now sets busy_timeout immediately on opening the connection,
before schema reads or WAL changes. Compiled service startup initializes and
closes SQLite after preflight, before spawning API/preview/optional worker.
No tables, user data, schema version, session semantics or worker authorization
were changed. Only server/database.ts and scripts/services.ts need replacement
on an installed host, followed by npm run build and a service restart.

Verification: lint, typecheck, production build, and eight database-lock,
supervisor and backup tests passed. A separate real production-mode synthetic
cold start verified API/preview health, signup, clean shutdown/restart and
persisted-account login. An initial test probe used fetch with a custom Host
header and got404; the corrected native HTTP probe preserved the required Host
and passed. No live host repair has been performed by this workspace.

Stop the host service before updating. Back up SQLite consistently using its
backup API and keep original code copies in private .data storage. Do not reset
the database or rerun the fresh-host bootstrap. After the two-file update/build,
restart NEXYRAL and verify local/public health before declaring the website live.

An interrupted original startup can also leave a valid, completely empty SQLite
file with user_version0. Readonly preflight now accepts version0 only when
sqlite_master contains no objects, allowing the parent to initialize it. Unknown
version0 databases with any objects remain rejected. Eleven relevant tests and
a production cold start from an existing empty version0 file passed, including
upgrade to7, both services, signup, restart and persisted-account login.

For the already installed host with the two-file lock fix, the owner can instead
initialize the diagnosed empty database once using the installed openDatabase
function. First assert readonly version0, no objects and integrityOK, then close
the probe, initialize as the service user, close SQLite and restart the service.
The existing private backup must be retained. No database deletion or manual
user_version override is required. This one-time initialization does not install
the new preflight source on the host. Live readiness still needs verification.
