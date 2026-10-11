import { useEffect, useState } from 'react';
interface Health { status: string; generationConfigured: boolean; emailCodeDeliveryConfigured: boolean }
export default function CloudStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/health', {signal:controller.signal,cache:'no-store'}).then(async response => {
      if (!response.ok) throw new Error('Service check failed. Please retry.');
      const value = await response.json() as Health;
      if(value.status !== 'ok' || typeof value.generationConfigured !== 'boolean') throw new Error('Service response was not recognized.');
      if (!controller.signal.aborted) {setHealth(value);setError('');}
    }).catch(error => {if(!controller.signal.aborted){setHealth(null);setError(error instanceof Error?error.message:'Service check unavailable.');}});
    return () => controller.abort();
  }, [attempt]);
  return <section className="status-ledger container" aria-label="Current service configuration">
    <p role="status">{error || (health ? 'Current configuration received from the deployed service. This is not an uptime or model-inference test.' : 'Checking the deployed service…')}</p>
    {health && [['Serverless API','Responding'],['AI provider',health.generationConfigured?'Configured · subject to provider availability':'Not configured'],['Verification email',health.emailCodeDeliveryConfigured?'Delivery configured':'Delivery not configured'],['React preview and source editor','Available in the browser'],['Automated builds and tests','Not available'],['Generated-app production deployment','Not available']].map(([name,state])=><div key={name}><span>{name}</span><span>{state}</span></div>)}
    <button className="cloud-action secondary" onClick={()=>setAttempt(value=>value+1)}>Check again</button>
  </section>;
}
