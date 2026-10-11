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
        Have an idea?
        <br />
        <span>Give it to NEXYRAL.</span>
      </h2>
      <p>Describe the interface you have in mind. Start making it real.</p>
      <div>
        <Button to="/get-started">Start Building</Button>
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
