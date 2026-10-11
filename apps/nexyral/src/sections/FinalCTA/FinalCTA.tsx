import { Button } from "../../components/ui/Primitives";
export default function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="final-cta container"
      aria-labelledby="final-title"
    >
      <div className="cta-core" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>N</span>
      </div>
      <span className="eyebrow">INTENT → EXECUTION</span>
      <h2 id="final-title">
        What will you
        <br />
        <span>build first?</span>
      </h2>
      <p>Start with a few sentences. We’ll help you turn them into a frontend you can build on.</p>
      <div>
        <Button to="/#start">Start with an idea</Button>
        <Button to="/how-it-works" secondary>
          Explore How It Works
        </Button>
      </div>
      <small>
        Free early access. Review generated code before putting it into production.
      </small>
    </section>
  );
}
