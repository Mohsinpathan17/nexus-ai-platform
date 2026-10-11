import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, RotateCcw, Play } from 'lucide-react';
import type { ProjectSource } from '../../lib/project-export';

export default function ReactPreview({ source }: { source: ProjectSource }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [revision, setRevision] = useState(0);
  const [document, setDocument] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    let active = true;
    const channel = crypto.randomUUID();
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'nexyral-preview' || event.data.key !== channel) return;
      if (event.data.state === 'ready' || event.data.state === 'error') {
        setState(event.data.state);
        setMessage(event.data.state === 'error' ? String(event.data.message).slice(0, 500) : 'Preview running. Try the buttons, forms and filters.');
      }
    }
    window.addEventListener('message', receive);
    // The compiler is asynchronous; invalidate the previous frame before its result arrives.
    queueMicrotask(() => { if (active) { setState('loading'); setMessage('Preparing your isolated React preview…'); setDocument(''); } });
    void import('../../lib/react-preview').then(({ reactPreviewDocument }) => {
      if (active) setDocument(reactPreviewDocument(source, channel));
    }).catch(error => { if (active) { setState('error'); setMessage(error instanceof Error ? error.message : 'Preview could not compile. Check App.tsx.'); } });
    const timer = window.setTimeout(() => { if (active) setState(current => {
      if (current === 'loading') { setMessage('Preview did not become ready. Check the code or restart the preview.'); return 'error'; }
      return current;
    }); }, 15000);
    return () => { active = false; window.removeEventListener('message', receive); clearTimeout(timer); };
  }, [source, revision, started]);
  return <section className="react-preview" aria-label="Interactive app preview">
    <div className="preview-toolbar"><div className="preview-address"><span className={`preview-dot ${state}`} />Your app / isolated preview</div><div className="preview-controls">
      <button aria-label="Desktop preview" aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}><Monitor size={18} /></button>
      <button aria-label="Mobile preview" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}><Smartphone size={18} /></button>
      <button aria-label="Restart preview" disabled={!started} onClick={() => setRevision(value => value + 1)}><RotateCcw size={18} /></button>
    </div></div>
    {!started ? <div className="preview-consent"><Play size={28} /><h4>Try the app you just made.</h4><p>Run the generated React code in an isolated preview. It has no access to your account or external services.</p><button className="cloud-action" onClick={() => setStarted(true)}>Run preview<Play size={16} /></button></div> : <>
      <p className="preview-status" role={state === 'error' ? 'alert' : 'status'}>{message}</p>
      {document && <div className={`preview-viewport ${mode}`}><iframe ref={frame} title="Your generated app" srcDoc={document} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" /></div>}
    </>}
    <p className="preview-footnote">Browser preview · React imports only · Network and storage isolated · Production build and tests not run</p>
  </section>;
}
