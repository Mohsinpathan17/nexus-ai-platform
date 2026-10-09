import { Check, ShieldCheck } from "lucide-react";
import { StorySection, DemoLabel } from "../../components/ui/StorySection";
const checks = [
  ["Build", "Production artifacts compile cleanly.", "PASSED"],
  ["Type Safety", "Contracts checked across the application.", "PASSED"],
  ["Tests", "Expected behavior evaluated against requirements.", "PASSED"],
  [
    "Accessibility",
    "Keyboard paths, semantics, and contrast reviewed.",
    "CHECKED",
  ],
  [
    "Security",
    "Dependencies, permissions, and input boundaries reviewed.",
    "CHECKED",
  ],
  ["Performance", "Loading and runtime behavior inspected.", "CHECKED"],
  ["Code Quality", "Maintainability and consistency evaluated.", "CHECKED"],
];
export default function Verification() {
  return (
    <StorySection
      id="verification"
      index="07"
      label="EVIDENCE BEFORE RELEASE"
      title={
        <>
          Built isn't finished.
          <br />
          <span>Verified is.</span>
        </>
      }
      description="The deliverable includes the checks. Their scope and results should be inspectable, with unresolved issues kept visible."
    >
      <DemoLabel />
      <div className="verification-layout">
        <div className="verification-seal">
          <ShieldCheck size={48} strokeWidth={1} />
          <h3>Release evidence</h3>
          <p>
            Not a single score.
            <br />A record of what was checked.
          </p>
          <span className="technical">ILLUSTRATIVE RELEASE / 001</span>
        </div>
        <div className="verification-ledger">
          {checks.map(([name, detail, state], i) => (
            <div key={name}>
              <span>0{i + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{detail}</p>
              </div>
              <span className="check-state">
                <Check size={12} />
                {state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </StorySection>
  );
}
