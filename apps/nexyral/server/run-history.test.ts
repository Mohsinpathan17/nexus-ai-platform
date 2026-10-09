import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database.ts";
import { createProject, createRun, runsFor } from "./runs.ts";
test("history exposes immediate same-project parents without copying evidence or leaking foreign lineage", () => {
  const db = openDatabase(":memory:");
  try {
    for (const id of ["owner", "other"]) db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(id, id, `${id}@history.test`, "hash", "salt", new Date().toISOString());
    const project = createProject(db, "owner", "Timeline");
    const other = createProject(db, "other", "Private");
    const source = createRun(db, "owner", project.id, "Create an accessible local counter.");
    db.prepare("UPDATE runs SET status='cancelled' WHERE id=?").run(source.id);
    const child = createRun(db, "owner", project.id, source.intent, { sourceId: source.id, requestId: randomUUID() }).run;
    db.prepare("UPDATE runs SET status='failed' WHERE id=?").run(child.id);
    const grandchild = createRun(db, "owner", project.id, source.intent, { sourceId: child.id, requestId: randomUUID() }).run;
    const foreign = createRun(db, "other", other.id, "Create another private local counter.");
    const legacy = createRun(db, "owner", project.id, "A legacy run without usable lineage.");
    const invalid = createRun(db, "owner", project.id, "A run with an invalid cross-project parent.");
    const insert = db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)");
    insert.run(randomUUID(), legacy.id, "retry-origin.json", "intent", "{", legacy.createdAt);
    insert.run(randomUUID(), invalid.id, "retry-origin.json", "intent", JSON.stringify({ parentRunId: foreign.id }), invalid.createdAt);
    const history = runsFor(db, "owner", project.id);
    assert.ok(history.find(run => run.id === source.id)!.sequence! < history.find(run => run.id === child.id)!.sequence!);
    assert.ok(history.find(run => run.id === child.id)!.sequence! < history.find(run => run.id === grandchild.id)!.sequence!);
    assert.equal(history.find(run => run.id === child.id)?.parentRunId, source.id);
    assert.equal(history.find(run => run.id === grandchild.id)?.parentRunId, child.id);
    assert.equal(history.find(run => run.id === source.id)?.parentRunId, undefined);
    assert.equal(history.find(run => run.id === legacy.id)?.parentRunId, undefined);
    assert.equal(history.find(run => run.id === invalid.id)?.parentRunId, undefined);
    assert.equal(JSON.stringify(history).includes(foreign.id), false);
    assert.equal(history.some(run => "artifacts" in run), false);
    assert.throws(() => runsFor(db, "other", project.id), /Project not found/);
  } finally { db.close(); }
});
