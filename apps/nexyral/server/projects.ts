import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./database.ts";
import { ownedProject } from "./runs.ts";
import { HttpError } from "./http.ts";

export function renameProject(db: DatabaseSync, ownerId: string, id: string, name: string, expectedName: string) {
  return transaction(db, () => {
    const project = ownedProject(db, ownerId, id);
    if (project.name !== expectedName) throw new HttpError(409, "This project was renamed elsewhere. Refresh before saving again.");
    db.prepare("UPDATE projects SET name=? WHERE id=? AND owner_id=?").run(name, id, ownerId);
    return { ...project, name };
  });
}
