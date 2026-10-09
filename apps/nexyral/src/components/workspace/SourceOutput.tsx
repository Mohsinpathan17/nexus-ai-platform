import { useState } from 'react';
import { Check, Copy, Download, FileCode2, PackageCheck } from 'lucide-react';
import { exportProject, type ProjectSource } from '../../lib/project-export';
function download(name: string, body: Blob) {
  const url = URL.createObjectURL(body), link = document.createElement('a');
  link.hidden = true; link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SourceOutput({ source }: { source: ProjectSource }) {
  const [file, setFile] = useState<'app' | 'css'>('app');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(source[file]); setCopied(true); setNotice('Source copied.'); }
    catch { setNotice('Clipboard is unavailable. Select the code or download the file.'); }
  }
  return <div className="cloud-source">
    <div className="cloud-source-heading"><div><span className="eyebrow">GENERATED / READY FOR REVIEW</span><h3>Your source. Your next move.</h3></div><button className="cloud-action" onClick={() => download('nexyral-project.zip', exportProject(source))}><PackageCheck size={18} />Download project</button></div>
    <div className="cloud-files" role="group" aria-label="Source files">
      <button aria-pressed={file === 'app'} onClick={() => { setFile('app'); setCopied(false); }}><FileCode2 size={16} />App.tsx</button>
      <button aria-pressed={file === 'css'} onClick={() => { setFile('css'); setCopied(false); }}>styles.css</button>
      <button onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}Copy</button>
      <button onClick={() => download(file === 'app' ? 'App.tsx' : 'styles.css', new Blob([source[file]], { type: 'text/plain;charset=utf-8' }))}><Download size={16} />Download file</button>
    </div>
    <pre tabIndex={0} aria-label="Generated source"><code>{source[file]}</code></pre>
    <p className="cloud-evidence">React + TypeScript project included · Build and tests not run · Review before executing.</p>
    <p className="cloud-copy-notice" role="status">{notice}</p>
  </div>;
}
