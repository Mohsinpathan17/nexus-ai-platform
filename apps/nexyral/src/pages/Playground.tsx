import { Link } from 'react-router-dom';
import SourceOutput from '../components/workspace/SourceOutput';
import { starterProject } from '../lib/starter-project';
import { ArrowUpRight } from 'lucide-react';
export default function Playground() {
  return <section className="cloud-studio playground container">
    <div className="playground-intro"><div><span className="eyebrow">OPEN WORKSPACE / NO ACCOUNT NEEDED</span><h1>See it. Change it.<br/><span>Make it yours.</span></h1><p>Try the task app, edit its code and see your changes. Keep what you create.</p></div><Link className="cloud-action" to="/#start">Build my own idea<ArrowUpRight size={18}/></Link></div>
    <details className="source-details playground-details"><summary>About this starter</summary><p>This is a prepared React starter. Your edits stay in this browser tab and can be downloaded. Sign in to generate an app and save projects to your account.</p></details>
    <SourceOutput source={starterProject} sourceLabel="PREPARED STARTER / READY TO EDIT" draftKey="nexyral-playground-draft"/>
  </section>;
}
