import { Link } from "react-router-dom";
import { useProviders } from "../hooks/useProviders";
const steps = [
  { label: "01 / YOUR WORKSPACE", title: "Create a project.", copy: "Choose Get Started and create an account on a connected workspace deployment. Create a project, then save any shared requirements. Each project and its evidence belongs to your account." },
  { label: "02 / RECORD INTENT", title: "Start with a small interface.", copy: "Describe the users, behavior and constraints. For example: build a local ticket list with filtering and a clear empty state. The current executor supports bounded client-side React interfaces; it cannot create a complete backend or install arbitrary dependencies." },
  { label: "03 / HUMAN REVIEW", title: "Approve a specific plan.", copy: "A connected planning worker prepares a proposal. Inspect or revise it before explicitly approving a frontend build. If no worker is connected, the run waits; submitting intent alone does not authorize execution." },
  { label: "04 / RECORDED EVIDENCE", title: "Inspect what actually ran.", copy: "Review type checking, production build and any owner-selected browser checks. Missing evidence is not a pass. When available, open the isolated preview or download stored source. Security, accessibility and performance audits have not run; nothing is deployed." },
  { label: "05 / NEXT ATTEMPT", title: "Keep failures inspectable.", copy: "A failed or cancelled run can be retried with a reviewed intent. It retains the original captured requirements, creates separate evidence and needs fresh approval. Create a normal new run if you want to use an updated project brief." },
];
const cloudSteps = [
  { label: "01 / YOUR ACCOUNT", title: "Create and verify your account.", copy: "Sign up with email, open the verification email and confirm your address before requesting AI generation. If your deployment offers GitHub sign-in, you can use it to authenticate; repository access is a separate capability." },
  { label: "02 / RECORD INTENT", title: "Describe one clear interface.", copy: "Save the people, behavior and constraints your interface needs to support. Start with a small React frontend. Authentication backends, database services and production deployment are outside the generated source scope." },
  { label: "03 / GENERATE SOURCE", title: "Give your idea to Gemini.", copy: "Select a saved project and explicitly request generation. Keep the tab open while the model responds. Provider quotas and a daily deployment budget apply; failed requests remain visible and can be retried." },
  { label: "04 / HUMAN REVIEW", title: "Generated does not mean verified.", copy: "Inspect and download App.tsx and styles.css. This workspace displays source without executing it. Type checking, build, tests, security review and deployment have not run. Review the code before running it in an isolated development environment." },
];
export default function GettingStartedGuide() {
  const cloud = import.meta.env.VITE_SERVERLESS === "1";
  const publicDemo = import.meta.env.VITE_PUBLIC_DEMO === "1";
  const providers = useProviders();
  return <section className="route-articles container" aria-label="Getting started workflow">
    <article><span className="technical">CURRENT AVAILABILITY</span><h2>Know which deployment you are using.</h2>
      <p>{publicDemo ? "This public website demo does not accept accounts or run engineering workers. Product walkthroughs are simulated." : cloud ? "This workspace supports saved projects and Gemini-generated frontend source when account, storage and AI providers are configured. Website walkthroughs remain simulated, and generated source is unverified." : "Accounts and project storage require the workspace service. Planning and building also require a configured worker; run details show its current availability. Website walkthroughs remain simulated."}</p>
      <p>Pricing and subscriptions are not available. {cloud ? "Verify your email before generation. Use the sign-in screen to request password recovery; delivery requires the account provider to be connected." : providers.email ? "Email verification and password recovery emails are enabled. Check your inbox and request another link if needed." : "Password recovery currently needs help from the deployment operator; automated email delivery is not connected."} {(cloud ? import.meta.env.VITE_FIREBASE_GITHUB === "1" : providers.github) ? "You can also continue with GitHub using a verified primary email." : "GitHub sign-in is not configured on this deployment."}</p>
      <Link to={publicDemo ? "/#watch" : "/get-started"}>{publicDemo ? "Explore the product walkthrough →" : "Open getting started →"}</Link>
    </article>
    {(cloud ? cloudSteps : steps).map(step => <article key={step.label}><span className="technical">{step.label}</span><h2>{step.title}</h2><p>{step.copy}</p></article>)}
    <article><span className="technical">VERIFICATION / PRODUCT CONCEPT</span><h2>Understand the evidence.</h2><p>Explore the verification workflow. Website examples describe product capabilities and do not measure your generated project.</p><Link to="/#verification">See verification concepts</Link></article>
  </section>;
}
