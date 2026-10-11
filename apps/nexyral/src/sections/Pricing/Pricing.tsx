import { Check, Sparkles } from "lucide-react";
import { StorySection } from "../../components/ui/StorySection";
import { Button } from "../../components/ui/Primitives";
import { useAuth } from "../../app/auth-context";

export default function Pricing() {
  const { user } = useAuth();
  return (
    <StorySection
      id="pricing"
      index="11"
      label="FREE TO START BUILDING"
      title={<>Your idea.<br /><span>A place to begin.</span></>}
      description="NEXYRAL is free to use during early access. Start with an idea, generate a frontend, and take the source with you."
    >
      <div className="free-access-layout">
        <article className="free-access-plan" aria-labelledby="free-plan-title">
          <span className="eyebrow"><Sparkles size={16} aria-hidden="true" /> EARLY ACCESS</span>
          <h3 id="free-plan-title">Free</h3>
          <p className="free-access-price">$0 <span>no subscription</span></p>
          <p className="free-access-description">A workspace for turning your first intent into frontend source.</p>
          <ul>
            {[
              "Your own project workspace",
              "AI frontend source generation",
              "React and TypeScript source",
              "Review and download your source",
            ].map((feature) => <li key={feature}><Check size={18} aria-hidden="true" /><span>{feature}</span></li>)}
          </ul>
          <Button to={user ? "/workspace" : "/get-started"}>{user ? "Open your workspace" : "Start building free"}</Button>
          <p className="free-access-note">No credit card required.</p>
        </article>
        <div className="free-access-details">
          <span className="eyebrow">CLEAR EXPECTATIONS</span>
          <h3>Build at your pace.<br />Keep control of your work.</h3>
          <p>Describe the interface you need, review the generated source, and continue development in your own environment.</p>
          <div><h4>Free access, shared capacity.</h4><p>Generation is subject to service capacity, provider quotas, and daily usage safeguards. Availability can vary.</p></div>
          <div><h4>Source is the starting point.</h4><p>Generated code needs your review. Automated builds, tests, backends, and production deployment are not included in the current cloud workspace.</p></div>
          <div><h4>Paid plans can come later.</h4><p>There is no checkout or recurring charge. Any future paid offering will be announced before you choose to subscribe.</p></div>
          <Button to="/docs" secondary>Read the getting started guide</Button>
        </div>
      </div>
    </StorySection>
  );
}
