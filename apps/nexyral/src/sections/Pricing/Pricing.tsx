import { StorySection } from "../../components/ui/StorySection";
import { plans } from "../../lib/product-content";
import { Button } from "../../components/ui/Primitives";
export default function Pricing() {
  return (
    <StorySection
      id="pricing"
      index="11"
      label="A PLACE TO START. ROOM TO GROW."
      title={
        <>
          Your ambition.
          <br />
          <span>Your next step.</span>
        </>
      }
      description="Four proposed plans. Final pricing, availability, limits, and included features have not been decided."
    >
      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <div key={plan.name} className={i === 1 ? "plan-highlight" : ""}>
            <span className="technical">
              0{i + 1} / {plan.audience}
            </span>
            <h3>{plan.name}</h3>
            <div className="price-state">Coming soon</div>
            <p>{plan.detail}</p>
            <span className="plan-note">PRICING NOT FINALIZED</span>
          </div>
        ))}
      </div>
      <div className="pricing-bottom">
        <p>Explore the direction before choosing a plan.</p>
        <Button to="/pricing" secondary>
          View plan direction
        </Button>
      </div>
    </StorySection>
  );
}
