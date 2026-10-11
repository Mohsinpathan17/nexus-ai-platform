import { Link } from 'react-router-dom';
import SourceOutput from '../components/workspace/SourceOutput';
import { starterProject } from '../lib/starter-project';
import { ArrowUpRight } from 'lucide-react';
export default function Playground() {
  return <section className="cloud-studio playground container">
    <div className="playground-intro"><div><span className="eyebrow">OPEN WORKSPACE / NO ACCOUNT NEEDED</span><h1>See it. Change it.<br/><span>Make it yours.</span></h1><p>Try an interactive task app, switch to the code, and change a headline or a color. Update the preview to see your edit. Download the project whenever you’re ready.</p></div><Link className="cloud-action" to="/#start">Build my own idea<ArrowUpRight size={18}/></Link></div>
    <p className="playground-note">This is a prepared React starter, not an AI generation. Your edits run locally in this preview and are recoverable in this browser tab, but are not saved to a cloud account. AI generation is available after sign-in.</p>
    <SourceOutput source={starterProject} sourceLabel="PREPARED STARTER / READY TO EDIT" draftKey="nexyral-playground-draft"/>
  </section>;
}
