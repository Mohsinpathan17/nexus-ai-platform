import { useState, type FormEvent } from 'react';
import { History, Sparkles, Undo2, ArrowUpRight } from 'lucide-react';
import type { ProjectSource } from '../../lib/project-export';
export interface SavedVersion { id: string; label: string; created_at: string }
export interface SourceOperations {
  revise: (instruction: string) => Promise<ProjectSource>;
  history: () => Promise<SavedVersion[]>;
  restore: (id: string) => Promise<ProjectSource>;
}
interface Props { operations: SourceOperations; dirty: boolean; onApplied: (source: ProjectSource) => void; onBusy: (busy: boolean) => void }
const suggestions=['Make the layout easier to use on mobile.','Add helpful empty states and clearer button labels.','Use a calmer color palette with stronger text contrast.'];
export default function RefinementPanel({operations,dirty,onApplied,onBusy}:Props) {
  const [instruction,setInstruction]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState(false);
  const [versions,setVersions]=useState<SavedVersion[]|null>(null);
  const [version,setVersion]=useState('');
  async function apply(action:()=>Promise<ProjectSource>,success:string) {
    setBusy(true);onBusy(true);setError(false);setNotice('Working on your request. Your previous app is kept safe.');
    try {const source=await action();onApplied(source);setInstruction('');setVersions(null);setNotice(success);}
    catch(error){setError(true);setNotice(error instanceof Error?error.message:'The change could not complete. Your previous app is safe.');}
    finally{setBusy(false);onBusy(false);}
  }
  function submit(event:FormEvent<HTMLFormElement>) {event.preventDefault();if(!busy&&!dirty)void apply(()=>operations.revise(instruction.trim()),'AI change saved. Run the preview to review it; a previous version is available below.');}
  async function history() {
    setBusy(true);setError(false);setNotice('Loading saved versions…');
    try{const items=await operations.history();setVersions(items);setVersion(items[0]?.id??'');setNotice(items.length?'Select a version to restore. The current source will also be kept.':'No earlier versions yet. Your next saved edit or AI change creates one.');}
    catch(error){setError(true);setNotice(error instanceof Error?error.message:'Versions could not load.');}
    finally{setBusy(false);}
  }
  return <section className="refinement-panel" aria-labelledby="refinement-title">
    <div className="refinement-heading"><span className="refinement-symbol"><Sparkles size={22}/></span><div><span className="eyebrow">KEEP BUILDING / WITH GEMINI</span><h4 id="refinement-title">Tell AI what to change.</h4><p>Describe one improvement. Your current app is the starting point.</p></div></div>
    <form onSubmit={submit}><label htmlFor="refinement-request">What would make this app better?</label><textarea id="refinement-request" rows={3} minLength={5} maxLength={4000} required disabled={busy||dirty} value={instruction} onChange={event=>setInstruction(event.target.value)} placeholder="Make the dashboard easier to read on a phone, and add a search box…"/>
      <div className="refinement-suggestions" aria-label="Suggested improvements">{suggestions.map((suggestion,index)=><button key={suggestion} type="button" disabled={busy||dirty} onClick={()=>setInstruction(suggestion)}>{['Improve mobile layout','Clearer interactions','Refine the colors'][index]}<ArrowUpRight size={13}/></button>)}</div>
      <div className="refinement-actions"><button className="cloud-action" disabled={busy||dirty||instruction.trim().length<5}><Sparkles size={17}/>{busy?'Working…':'Apply AI change'}</button><span>{dirty?'Save or discard your code edits before asking AI.':'A previous version is saved automatically. AI capacity limits apply.'}</span></div>
    </form>
    <div className="refinement-history"><button className="cloud-action secondary" disabled={busy} onClick={()=>void history()}><History size={17}/>Saved versions</button>{versions&&versions.length>0&&<div className="version-picker"><label htmlFor="saved-version">Restore a previous version</label><select id="saved-version" value={version} onChange={event=>setVersion(event.target.value)} disabled={busy||dirty}>{versions.map(item=><option key={item.id} value={item.id}>{item.label} · {new Date(item.created_at).toLocaleString()}</option>)}</select><button className="cloud-action secondary" disabled={busy||dirty||!version} onClick={()=>{if(window.confirm('Restore this saved version? Your current source will be kept as another version.'))void apply(()=>operations.restore(version),'Saved version restored. Run the preview to review it.');}}><Undo2 size={17}/>Restore version</button></div>}</div>
    <p className="refinement-notice" role={error?'alert':'status'}>{notice}</p>
  </section>;
}
