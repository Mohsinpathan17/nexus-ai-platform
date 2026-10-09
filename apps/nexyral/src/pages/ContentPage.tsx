import { useLocation, Link } from "react-router-dom";
import { Button } from "../components/ui/Primitives";
import Workspace from "../sections/Product/Workspace";
import Workflow from "../sections/Workflow/Workflow";
import Features from "../sections/Features/Features";
import Solutions from "../sections/Solutions/Solutions";
import Pricing from "../sections/Pricing/Pricing";
import GettingStartedGuide from "./GettingStartedGuide";
import { useProviders } from "../hooks/useProviders";
const content: Record<string, { title: string; intro: string }> = {
  product: {
    title: "Engineering, connected.",
    intro:
      "NEXYRAL is an autonomous engineering platform in development. It connects intent, planning, implementation, verification, and release in one inspectable workflow.",
  },
  "how-it-works": {
    title: "Intent becomes a process.",
    intro:
      "Start with an outcome and its constraints. The engineering loop turns that intent into a plan, a working implementation, and reviewable release evidence.",
  },
  features: {
    title: "The whole engineering loop.",
    intro:
      "Capabilities designed to share context, recover from failures, and keep consequential decisions under human control.",
  },
  solutions: {
    title: "A system for your next idea.",
    intro:
      "Different projects need different decisions. Explore how a connected engineering workflow can support yours.",
  },
  pricing: {
    title: "Room for your ambition.",
    intro:
      "Free, Pro, Pro+, and Team are proposed tiers. Pricing and entitlements are not finalized, and subscriptions are not available yet.",
  },
  docs: {
    title: "The engineering handbook.",
    intro:
      "Your guide to accounts, project requirements, plan approval and recorded engineering evidence. Start with the current capabilities and review each consequential action.",
  },
  about: {
    title: "Ideas deserve to exist.",
    intro:
      "NEXYRAL explores a simple premise: intent should travel intact through the work needed to make software real.",
  },
  contact: {
    title: "Start with a clear intent.",
    intro:
      "Reach your deployment's support team using its configured email address. Include a description of the issue and keep passwords and private access links out of your message.",
  },
  status: {
    title: "A clear view of availability.",
    intro:
      "Personal accounts, projects, and stored engineering runs are implemented. Local planning and owner-approved isolated frontend builds require a configured worker. Billing and production deployment remain unavailable.",
  },
};
export default function ContentPage() {
  const key = useLocation().pathname.replace(/^\/+|\/+$/g, "");
  const page = content[key];
  const providers = useProviders();
  return (
    <>
      <section className="route-intro container">
        <span className="eyebrow">
          NEXYRAL / {key.replaceAll("-", " ").toUpperCase()}
        </span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <div>
          <Button to="/get-started">Explore getting started</Button>
          <Link className="text-button" to="/">
            Back to Home
          </Link>
        </div>
      </section>
      {key === "product" && <Workspace />}
      {key === "how-it-works" && <Workflow />}
      {key === "features" && <Features />}
      {key === "solutions" && <Solutions />}
      {key === "pricing" && <Pricing />}
      {key === "docs" && <GettingStartedGuide />}
      {key === "contact" && <section className="route-articles container"><article><h2>Contact support.</h2>{providers.supportEmail ? <a href={`mailto:${providers.supportEmail}`}>{providers.supportEmail}</a> : <p>A support inbox has not been configured on this deployment.</p>}</article></section>}
      {key === "about" && (
        <section className="route-articles container">
          <article>
            <h2>Context is part of the product.</h2>
            <p>
              Architecture, requirements, and decisions should remain connected
              as software evolves. That continuity is the foundation of NEXYRAL.
            </p>
          </article>
          <article>
            <h2>Autonomy needs evidence.</h2>
            <p>
              Plans and patches should be inspectable. Release decisions should
              reflect what was verified, with human control over consequential
              actions.
            </p>
          </article>
        </section>
      )}
      {key === "contact" && (
        <section className="contact-guide container">
          <h2>Prepare your project brief.</h2>
          <ol>
            {[
              "Who is the product for?",
              "What should someone be able to do?",
              "What existing systems must it connect to?",
              "Which constraints and approval points matter?",
              "How will you know the outcome is correct?",
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p>
            No form is collecting your information here. A secure contact
            channel will be added when available.
          </p>
          <Button to="/docs" secondary>
            Read the intent guide
          </Button>
        </section>
      )}
      {key === "status" && (
        <section className="status-ledger container">
          {[
            ["Website preview", "Available in this build"],
            ["Product demonstrations", "Illustrative"],
            ["Engineering platform", "In development"],
            ["Personal accounts", "Available on this instance"],
            ["Billing", "Not available"],
            ["Production deployment", "Not available"],
          ].map(([name, state]) => (
            <div key={name}>
              <span>{name}</span>
              <span>{state}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
