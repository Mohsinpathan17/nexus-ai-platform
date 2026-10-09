import { useState } from "react";
import { Check, ArrowRight, RotateCcw } from "lucide-react";
import { StorySection, DemoLabel } from "../../components/ui/StorySection";
const recovery = [
  ["BUILD FAILED", "Type mismatch detected in analytics API response."],
  [
    "INVESTIGATING",
    "Trace the response contract and the consuming analytics component.",
  ],
  [
    "ROOT CAUSE IDENTIFIED",
    "Located: src/api/analytics.ts. The count field arrives as a string.",
  ],
  ["PATCH GENERATED", "Normalize the response type at the API boundary."],
  ["TESTS RE-RUN", "Illustrative result: 12 / 12 tests passed."],
  [
    "BUILD PASSED",
    "System recovered. Verification evidence is ready for review.",
  ],
];
export default function SelfRepair() {
  const [step, setStep] = useState(0);
  return (
    <StorySection
      id="repair"
      index="06"
      label="THE RECOVERY LOOP"
      title={
        <>
          When something breaks,
          <br />
          <span>NEXYRAL keeps working.</span>
        </>
      }
      description="A failed check becomes an investigation. The repair stays focused, and the evidence stays visible."
    >
      <DemoLabel />
      <div className={`repair-layout ${step === 5 ? "recovered" : ""}`}>
        <ol className="repair-sequence">
          {recovery.map(([name], i) => (
            <li key={name} className={i <= step ? "reached" : ""}>
              <span>
                {i < step ? (
                  <Check size={12} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {name}
            </li>
          ))}
        </ol>
        <div className="repair-evidence">
          <span className="technical">
            RECOVERY / {step === 5 ? "COMPLETE" : "ANALYTICS API"}
          </span>
          <h3>{recovery[step][0]}</h3>
          <p role="status">{recovery[step][1]}</p>
          <div className="patch">
            <span>src/api/analytics.ts</span>
            <code>
              {step < 3 ? (
                <span>Expected: number · received: string</span>
              ) : (
                <>
                  <del>count: response.count</del>
                  <ins>count: Number(response.count)</ins>
                </>
              )}
            </code>
          </div>
          <div className="repair-actions">
            <button
              className="button"
              onClick={() => setStep(step === 5 ? 0 : step + 1)}
            >
              {step === 5 ? <RotateCcw size={14} /> : <ArrowRight size={14} />}{" "}
              {step === 5 ? "Replay recovery" : "Next recovery step"}
            </button>
            <span>{step === 5 ? "SYSTEM RECOVERED" : `${step + 1} / 6`}</span>
          </div>
        </div>
      </div>
    </StorySection>
  );
}
