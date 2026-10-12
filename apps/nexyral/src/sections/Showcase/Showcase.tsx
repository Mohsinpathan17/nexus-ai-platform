import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Play, Code2, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StorySection } from '../../components/ui/StorySection';
import GeneratedPreview from '../../components/examples/GeneratedPreview';
import { publicExamples, type PublicExample } from '../../../shared/public-examples';
import './live-showcase.css';
export default function Showcase() {
  const [selected, setSelected] = useState<string>(publicExamples[0].id);
  const [result, setResult] = useState<PublicExample | null>(null);
  const [status, setStatus] = useState<'loading'|'idle'|'building'|'ready'|'error'>('loading');
  const [error, setError] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [fresh, setFresh] = useState(false);
  const requestVersion = useRef(0);
  const example = publicExamples.find(item => item.id === selected)!;
  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    fetch(`/api/examples/${selected}`,{ signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not load the example.');
      if (version !== requestVersion.current) return;
      if (data.source) { setResult(data); setStatus('ready'); } else setStatus('idle');
    }).catch(reason => {
      if (!controller.signal.aborted && version === requestVersion.current) { setError(reason instanceof Error ? reason.message : 'Could not load the example.'); setStatus('error'); }
    });
    return () => { controller.abort(); requestVersion.current = version + 1; };
  },[selected]);
  function chooseExample(id: string) {
    if (id === selected) return;
    requestVersion.current += 1;
    setSelected(id); setResult(null); setStatus('loading'); setSourceOpen(false); setError(''); setFresh(false);
  }
  async function build() {
    const version = requestVersion.current;
    setStatus('building'); setError('');
    try {
      const response = await fetch(`/api/examples/${selected}`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'The AI request failed.');
      if (version !== requestVersion.current) return;
      setResult(data); setFresh(!data.cached); setStatus('ready');
    } catch(reason) {
      if (version === requestVersion.current) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'The AI request failed.'); }
    }
  }
  return <StorySection id="showcase" index="01" label="PROOF YOU CAN INTERACT WITH" title={<>Don’t take our word for it.<br/><span>Use what NEXYRAL builds.</span></>} description="Real AI-generated frontends. Change an input, complete a task, or resolve a ticket. The result is right here—not behind a video.">
    <div className="live-example-tabs" aria-label="Choose a live example">
      {publicExamples.map((item,index) => <button key={item.id} aria-pressed={selected===item.id} onClick={() => chooseExample(item.id)}><span>0{index+1}</span>{item.title}<ArrowUpRight size={17}/></button>)}
    </div>
    <div className="live-example-shell">
      <aside className="live-brief">
        <span className="eyebrow">THE REQUEST</span><h3>{example.title}</h3><p>{example.description}</p>
        <details><summary>Read the exact AI brief</summary><p>{example.brief}</p></details>
        <div className="live-provenance"><span className="eyebrow">BUILD RECORD</span>
          {result ? <><strong>{fresh ? 'Generated just now' : 'Saved AI build'}</strong><span>NEXYRAL AI</span><time dateTime={result.generatedAt}>{new Date(result.generatedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</time><p>Generated with NEXYRAL AI. Frontend only; sample data, no connected backend.</p></> : <p>The first visitor’s build is saved so everyone can use it without repeating the AI request.</p>}
        </div>
        <Link to="/get-started" className="live-custom-link">Now build your own idea <ArrowUpRight size={17}/></Link>
      </aside>
      <div className="live-app-area" data-example={selected} aria-busy={status === 'loading' || status === 'building'}>
        <div className="live-app-bar"><span role="status"><i/> {result ? 'INTERACTIVE PREVIEW' : 'NEXYRAL / BUILD'}</span>{result && <button onClick={()=>setSourceOpen(!sourceOpen)} aria-expanded={sourceOpen}><Code2 size={16}/>{sourceOpen ? 'Show app' : 'View code'}</button>}</div>
        {result ? sourceOpen ? <pre className="live-source" tabIndex={0} aria-label="Actual AI-generated source">{`<!-- MARKUP -->\n${result.source.html}\n\n/* STYLES */\n${result.source.css}\n\n// JAVASCRIPT\n${result.source.js}`}</pre> : <GeneratedPreview key={result.id} source={result.source} title={example.title}/> : <div className="live-build-empty">
          {status==='loading' || status==='building' ? <Loader2 size={32} className="live-loading"/> : <Code2 size={38}/>}
          <h3>{status==='building' ? 'NEXYRAL AI is building this app.' : status==='loading' ? 'Loading the build record…' : status==='error' ? 'The build needs another look.' : 'A brief goes in. An app comes out.'}</h3>
          <p role="status">{error || (status==='building' ? 'This is a real AI request. We’ll show the app when the provider returns complete code.' : status==='loading' ? 'Looking for a saved AI build.' : 'Start a real build of this brief, then try the result here.')}</p>
          {!['loading','building'].includes(status) && <button className="button button-primary" onClick={()=>void build()}>{status==='error' ? <RefreshCw size={17}/> : <Play size={17}/>} {status==='error' ? 'Try again' : 'Build this example'}</button>}
        </div>}
        <div className="live-app-foot">{result ? 'Try the controls above · Code runs in an isolated browser preview' : 'No simulated build logs · Shared free-tier AI budget applies'}</div>
      </div>
    </div>
  </StorySection>;
}
