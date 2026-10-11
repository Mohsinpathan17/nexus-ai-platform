const key = 'nexyral-build-draft';
export function readBuildDraft(): string {
  try { return sessionStorage.getItem(key)?.slice(0,8000) ?? ''; }
  catch { return ''; }
}
export function saveBuildDraft(value: string): boolean {
  try { sessionStorage.setItem(key,value.slice(0,8000)); return true; }
  catch { return false; }
}
export function clearBuildDraft(): void {
  try { sessionStorage.removeItem(key); } catch { /* Storage can be disabled. */ }
}
