import { Check, Lock } from "lucide-react";
import { StorySection, DemoLabel } from "../../components/ui/StorySection";
export default function Deployment() {
  return (
    <StorySection
      id="deployment"
      index="08"
      label="THE RELEASE HANDOFF"
      title={
        <>
          From generated
          <br />
          <span>to production-ready.</span>
        </>
      }
      description="Carry the same intent into the release: configuration, artifacts, validation, and a deliberate approval point."
    >
      <DemoLabel />
      <div className="deployment-track">
        {["Local", "Build", "Test", "Verify", "Production"].map((stage, i) => (
          <div key={stage} className={i === 4 ? "production-node" : ""}>
            <span className="deploy-node">
              {i < 4 ? <Check size={15} /> : <Lock size={15} />}
            </span>
            <strong>{stage}</strong>
            <small>{i === 4 ? "HUMAN APPROVAL" : "ILLUSTRATIVE CHECK"}</small>
          </div>
        ))}
      </div>
      <div className="deployment-release">
        <div>
          <span className="technical">READY TO DEPLOY</span>
          <p>Verified artifacts. Clear release context. Your approval.</p>
        </div>
        <button
          className="button button-secondary"
          aria-describedby="deploy-note"
          disabled
        >
          <Lock size={14} />
          Approve deployment
        </button>
      </div>
      <p id="deploy-note" className="disclosure">
        Demonstration only. This control does not deploy an application.
      </p>
    </StorySection>
  );
}
