import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportProject, projectFiles } from '../../src/lib/project-export.ts';
test('export ZIP extracts with valid CRC and a trusted React fixture typechecks and builds', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nexyral-export-'));
  const source = { app: 'import { useState } from "react";\nexport default function App() { const [count, setCount] = useState(0); return <main><h1>Counter ✨</h1><button onClick={() => setCount(count + 1)}>{count}</button></main>; }', css: 'main { padding: 2rem; }' };
  try {
    await writeFile(join(directory, 'project.zip'), new Uint8Array(await exportProject(source).arrayBuffer()));
    const extracted = JSON.parse(execFileSync('python3', ['-c', 'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2]); print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))', join(directory, 'project.zip'), directory], { encoding: 'utf8' }));
    assert.deepEqual(extracted, projectFiles(source));
    assert.equal(Object.keys(extracted).length, 10);
    // Only this trusted fixture runs. Real generated user source is never executed here.
    await symlink(join(process.cwd(), 'node_modules'), join(directory, 'node_modules'), 'dir');
    try { execFileSync('npm', ['run', 'build'], { cwd: directory, encoding: 'utf8', stdio: 'pipe' }); } catch (error) { throw new Error(error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error)); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
