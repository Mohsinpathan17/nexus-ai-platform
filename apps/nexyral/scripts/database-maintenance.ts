import { resolve } from "node:path";
import { createBackup, restoreBackup } from "../server/backups.ts";
const [command, first, second, ...extra] = process.argv.slice(2);
if (extra.length) throw new Error("Unexpected arguments.");
if (command === "backup" && !second) {
  const directory = await createBackup(resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"), resolve(first ?? ".data/backups"));
  console.log(`Consistent database backup verified: ${directory}. Store a protected off-machine copy separately.`);
} else if (command === "restore" && first && second) {
  console.log(await restoreBackup(first, second));
  console.log("Recovered to a new path only. Stop all database services before selecting it via NEXYRAL_DB_PATH. Existing services were not changed.");
} else throw new Error("Usage: npm run db:maintenance -- backup [directory] | restore <backup-directory> <new-database-path>");
