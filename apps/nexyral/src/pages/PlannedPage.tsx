import { useLocation } from "react-router-dom";
import { Button } from "../components/ui/Primitives";
const titles: Record<string, string> = {
  product: "Engineering, connected.",
  "how-it-works": "From understanding to shipping.",
  features: "Built around the whole workflow.",
  solutions: "Make room for your next idea.",
  pricing: "A plan for every ambition.",
  docs: "The engineering handbook.",
  about: "Ideas deserve to exist.",
  contact: "Let’s build a connection.",
  login: "Your workspace is on its way.",
  "get-started": "Your next idea starts here.",
  privacy: "Privacy, by design.",
  terms: "Clear terms. Shared expectations.",
};
export default function PlannedPage() {
  const key = useLocation().pathname.replace(/^\/+|\/+$/g, "");
  return (
    <section className="planned container">
      <span className="eyebrow">NEXYRAL / {key.toUpperCase()}</span>
      <h1>{titles[key] ?? "This page could not be found."}</h1>
      <p>
        {key === "pricing"
          ? "Free, Pro, Pro+ and Team plans are being developed. Commercial pricing has not been announced."
          : key === "login" || key === "get-started"
            ? "The NEXYRAL platform is in development. Account creation and software generation are not available in this website preview."
            : "This part of NEXYRAL is being developed. Explore the interactive engineering concept on the home page."}
      </p>
      {key === "pricing" && (
        <div className="pricing-placeholder">
          {["Free", "Pro", "Pro+", "Team"].map((tier) => (
            <div key={tier}>
              <h2>{tier}</h2>
              <span>Coming soon</span>
            </div>
          ))}
        </div>
      )}
      <Button to="/">Explore NEXYRAL</Button>
    </section>
  );
}
