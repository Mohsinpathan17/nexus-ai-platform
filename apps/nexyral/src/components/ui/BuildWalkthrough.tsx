export default function BuildWalkthrough() {
  return <div className="build-film">
    <div className="build-film-heading"><div><span className="eyebrow">THE WORKSPACE / IN 30 SECONDS</span><h3>From your first idea<br/>to your first source.</h3></div><p>A short walkthrough of the current product.<br/>Example project · AI response times vary.</p></div>
    <video controls playsInline preload="none" poster="/media/nexyral-walkthrough-poster.jpg" aria-label="30-second NEXYRAL build walkthrough">
      <source src="/media/nexyral-how-to-build.mp4" type="video/mp4"/>
      <track kind="captions" src="/media/nexyral-how-to-build.vtt" srcLang="en" label="English" default/>
      Your browser cannot play this video. <a href="/media/nexyral-how-to-build.mp4">Download the walkthrough</a>.
    </video>
    <details><summary>Read the walkthrough</summary><ol><li>Create an account with email or Google.</li><li>For email signup, enter the six-digit verification code from your email.</li><li>Describe the pages, behavior and style of your frontend.</li><li>Save your project to your workspace.</li><li>Generate React and TypeScript source with Gemini. Response times vary.</li><li>Download the project, review it, then build and test locally before deployment.</li></ol></details>
  </div>;
}
