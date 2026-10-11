import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, MessageSquare, Sparkles, Download } from 'lucide-react';
import { saveBuildDraft } from '../../lib/build-draft';
const starters = [
  ['Booking page','Create a booking page for a small design studio. Show services, available time slots, and a simple booking form. Use sample data and a clean mobile-friendly layout.'],
  ['Business dashboard','Create a small business dashboard with sample sales, expenses, a revenue summary, and a filter for the reporting period. Make it easy to read on a phone.'],
  ['Support inbox','Create a customer support inbox with sample tickets, search, status filters, and a conversation view. Let me mark tickets as resolved. Make the layout work on mobile.'],
] as const;
export default function GettingStarted() {
  const navigate = useNavigate();
  const [idea,setIdea] = useState<string>(starters[0][1]);
  const [error,setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saveBuildDraft(idea.trim())) { setError('Your browser blocked draft storage. You can still open the workspace and copy your idea there.'); return; }
    navigate('/get-started');
  }
  return <section id="start" className="start-section container" aria-labelledby="start-title">
    <div className="start-intro"><span className="eyebrow">YOUR FIRST APP STARTS HERE</span><h2 id="start-title">You bring the idea.<br/><span>We help you start.</span></h2><p>You don’t need to know how to write a prompt. Say what the app should do, who it is for, and what matters to you.</p>
      <ol className="plain-steps">{[
        {icon:MessageSquare,title:'Describe it',description:'Use your own words. A few sentences are enough.'},
        {icon:Sparkles,title:'Generate it',description:'After signing in, save your project and ask AI to create the code.'},
        {icon:Download,title:'Make it yours',description:'Try your app, ask AI for changes, and download the project.'},
      ].map(({icon:Icon,title,description},index)=><li key={title}><span className="plain-step-icon"><Icon size={19}/></span><div><strong><small>0{index+1}</small>{title}</strong><p>{description}</p></div></li>)}</ol>
    </div>
    <form className="idea-composer" onSubmit={submit}>
      <div className="composer-title"><span className="composer-dot"/> NEW PROJECT <span>YOUR WORDS → YOUR CODE</span></div>
      <label htmlFor="first-idea">What would you like to make?</label>
      <p className="composer-hint" id="idea-hint">Pick an idea below, or replace it with your own.</p>
      <div className="idea-starters" aria-label="Example app ideas">{starters.map(([label,brief])=><button key={label} type="button" aria-label={`Use ${label.toLowerCase()} idea`} aria-pressed={idea===brief} onClick={()=>{setIdea(brief);setError('');}}>{label}</button>)}</div>
      <textarea id="first-idea" value={idea} onChange={event=>setIdea(event.target.value)} aria-describedby="idea-hint idea-next" minLength={10} maxLength={8000} rows={5} required/>
      <div className="composer-submit"><span>Free early access<br/><small>No credit card required</small></span><button className="button" type="submit">Continue with this idea <ArrowUpRight size={17}/></button></div>
      <p id="idea-next" className="composer-next">Next: create your account or sign in. Your idea will be waiting in your workspace.</p>
      {error && <div className="composer-error" role="alert"><p>{error}</p><button type="button" onClick={()=>navigate('/get-started')}>Open the workspace</button></div>}
    </form>
  </section>;
}
