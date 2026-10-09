// Kept as a compatibility entrypoint for existing startup instructions.
process.argv.splice(2, 0, "dev");
await import("../scripts/services.ts");
