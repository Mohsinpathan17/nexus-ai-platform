import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, FileCode2, PackageCheck, Eye, Code2, Save, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import RefinementPanel, { type SourceOperations } from './RefinementPanel';
import { exportProject, type ProjectSource } from '../../lib/project-export';
const ReactPreview = lazy(() => import('../preview/ReactPreview'));
function download(name: string, body: Blob) {
  const url = URL.createObjectURL(body), link = document.createElement('a');
  link.hidden = true; link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
interface Props {
  source: ProjectSource;
  onSave?: (source: ProjectSource) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  draftKey?: string;
  sourceLabel?: string;
  operations?: SourceOperations;
}
function restoredDraft(source: ProjectSource, key?: string): ProjectSource {
  if (!key) return source;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as {base?:ProjectSource;draft?:ProjectSource} | null;
    if (value?.base?.app === source.app && value.base.css === source.css && typeof value.draft?.app === 'string' && value.draft.app.length <= 60000 && typeof value.draft.css === 'string' && value.draft.css.length <= 30000) return value.draft;
  } catch { /* Storage failure never prevents editing or exporting. */ }
  return source;
}
export default function SourceOutput({ source, onSave, onDirtyChange, draftKey, sourceLabel = 'GENERATED / READY FOR REVIEW', operations }: Props) {
  const [draft, setDraft] = useState(() => restoredDraft(source, draftKey));
  const [preview, setPreview] = useState(source);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [file, setFile] = useState<'app' | 'css'>('app');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(() => restoredDraft(source, draftKey) !== source ? 'Unsaved edits restored from this browser tab. Save or download to keep them.' : '');
  const previousSource = useRef(source);
  useEffect(() => {
    const previous=previousSource.current;previousSource.current=source;
    if(previous.app===source.app&&previous.css===source.css)return;
    // Polling can deliver a completed request after a reload. Adopt it only if the local editor was unchanged.
    queueMicrotask(()=>{
      setDraft(current=>current.app===previous.app&&current.css===previous.css?source:current);
      setPreview(current=>current.app===previous.app&&current.css===previous.css?source:current);
    });
  },[source]);
  const dirty = draft.app !== source.app || draft.css !== source.css;
  const previewStale = preview.app !== draft.app || preview.css !== draft.css;
  function remember(next: ProjectSource) {
    setDraft(next);
    try { if (draftKey) sessionStorage.setItem(draftKey, JSON.stringify({base:source,draft:next})); }
    catch { setNotice('Tab recovery is unavailable. Save or download your edits before leaving.'); }
  }
  function forgetDraft() { try { if (draftKey) sessionStorage.removeItem(draftKey); } catch { /* Export remains available. */ } }
  useEffect(() => {
    onDirtyChange?.(dirty);
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); };
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  async function copy() {
    try { await navigator.clipboard.writeText(draft[file]); setCopied(true); setNotice('Source copied.'); }
    catch { setNotice('Clipboard is unavailable. Select the code or download the file.'); }
  }
  async function save() {
    if (!onSave) return;
    setSaving(true); setNotice('Saving your changes…');
    try { await onSave(draft); forgetDraft(); setNotice('Changes saved to your project.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed. Your edits remain here; download a copy before leaving.'); }
    finally { setSaving(false); }
  }
  return <div className="cloud-source">
    <div className="cloud-source-heading"><div><span className="eyebrow">{sourceLabel}</span><h3>Your source. Your next move.</h3><p>Try it. Make it yours. Keep the code.</p></div><button className="cloud-action" onClick={() => download('nexyral-project.zip', exportProject(draft))}><PackageCheck size={18} />Download project</button></div>
    <div className="source-toolbar"><div role="group" aria-label="Workspace view" className="source-view">
      <button aria-pressed={view === 'preview'} onClick={() => setView('preview')}><Eye size={17} />Preview</button>
      <button aria-pressed={view === 'code'} onClick={() => setView('code')}><Code2 size={17} />Edit code</button>
    </div><span className="source-save-state">{dirty ? 'Unsaved edits' : onSave ? 'Saved source' : 'Starter source'}</span></div>
    <div className={`source-work-area ${operations ? 'with-refinement' : ''}`}>
    {view === 'preview' ? <>
      {previewStale && <div className="preview-update"><span>Your code has changed.</span><button className="cloud-action secondary" onClick={() => setPreview({ ...draft })}>Update preview</button></div>}
      <Suspense fallback={<p role="status">Loading the preview workspace…</p>}><ReactPreview source={preview} /></Suspense>
    </> : <div className="source-code-panel">
      <div className="cloud-files" role="group" aria-label="Source files">
        <button aria-pressed={file === 'app'} onClick={() => { setFile('app'); setCopied(false); }}><FileCode2 size={16} />App.tsx</button>
        <button aria-pressed={file === 'css'} onClick={() => { setFile('css'); setCopied(false); }}>styles.css</button>
        <button onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}Copy</button>
        <button onClick={() => download(file === 'app' ? 'App.tsx' : 'styles.css', new Blob([draft[file]], { type: 'text/plain;charset=utf-8' }))}><Download size={16} />Download file</button>
      </div>
      <label className="source-editor-label" htmlFor="source-editor">Edit {file === 'app' ? 'App.tsx' : 'styles.css'}</label>
      <textarea id="source-editor" className="source-editor" spellCheck={false} value={draft[file]} disabled={saving} maxLength={file === 'app' ? 60000 : 30000} onChange={event => { remember({ ...draft, [file]: event.target.value }); setCopied(false); }} />
      <div className="source-edit-actions">
        <button className="cloud-action" onClick={() => { setPreview({ ...draft }); setView('preview'); }}><Eye size={17} />Preview changes</button>
        {onSave && <button className="cloud-action secondary" disabled={!dirty || saving} onClick={() => void save()}><Save size={17} />{saving ? 'Saving…' : 'Save changes'}</button>}
        <button className="cloud-action secondary" disabled={!dirty || saving} onClick={() => { if (window.confirm('Discard these unsaved edits and restore the saved source?')) { forgetDraft(); setDraft(source); setPreview(source); setNotice('Saved source restored.'); } }}><Undo2 size={17} />Discard edits</button>
      </div>
    </div>}
    {operations && <RefinementPanel operations={operations} dirty={dirty} onBusy={setSaving} onApplied={next => {forgetDraft();setDraft(next);setPreview(next);setView('preview');setNotice('');}}/>}
    </div>
    <details className="source-details"><summary>Preview and export details</summary><p>The preview runs in your browser. Your download includes the code currently in the editor. Review and test your project before deploying it.</p><Link to="/docs">Read the project guide →</Link></details>
    <p className="cloud-copy-notice" role="status">{notice}</p>
  </div>;
}
