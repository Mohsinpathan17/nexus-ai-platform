import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, Circle, Pause, Play, RotateCcw } from "lucide-react";
import { StorySection, DemoLabel } from "../../components/ui/StorySection";
import BuildWalkthrough from "../../components/ui/BuildWalkthrough";
import SupportPreview from "../../components/ui/SupportPreview";
const operations = [
  "Understanding request",
  "Requirements identified",
  "Planning architecture",
  "Application structure created",
  "Database schema designed",
  "Authentication configured",
  "API layer created",
  "Interface components generated",
  "Running type checks",
  "Running tests",
  "Verification complete",
  "Ready to ship",
];
const artifacts = [
  "intent.md",
  "requirements.md",
  "architecture.md",
  "src/",
  "database/schema.sql",
  "src/lib/auth.ts",
  "src/api/tickets.ts",
  "src/pages/Inbox.tsx",
  "typecheck",
  "tests/tickets.test.ts",
  "verification.json",
  "release.md",
];
export default function BuildDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const current = reduced ? operations.length : step;
  const complete = current === operations.length;
  useEffect(() => {
    if (!running || reduced || step >= operations.length) return;
    const timer = window.setTimeout(() => setStep(step + 1), 650);
    return () => clearTimeout(timer);
  }, [running, reduced, step]);
  return (
    <StorySection
      id="watch"
      index="03"
      label="INTENT INTO SOFTWARE"
      title={
        <>
          Watch an idea
          <br />
          <span>become software.</span>
        </>
      }
      description="Follow the engineering sequence, from the first requirement to the release handoff."
    >
      <BuildWalkthrough />
      <div className="run-toolbar">
        <DemoLabel />
        <button
          className="button button-secondary"
          disabled={Boolean(reduced)}
          onClick={() => {
            if (complete) {
              setStep(0);
              setRunning(true);
            } else setRunning(!running);
          }}
        >
          {complete ? (
            <RotateCcw size={14} />
          ) : running ? (
            <Pause size={14} />
          ) : (
            <Play size={14} />
          )}{" "}
          {reduced
            ? "Final state · reduced motion"
            : complete
              ? "Replay execution"
              : running
                ? "Pause execution"
                : "Run execution"}
        </button>
      </div>
      <div className="orchestration-console">
        <div className="console-heading">
          <span className="technical">SUPPORTOS / ENGINEERING RUN</span>
          <span className="technical">
            {complete
              ? "READY TO SHIP"
              : running
                ? "EXECUTING"
                : "AWAITING INTENT"}
            <i className="signal-dot" />
          </span>
        </div>
        <div className="console-intent">
          <span className="technical">INTENT / 001</span>
          <p>
            “Build an AI customer support platform with authentication, ticket
            management, analytics and team collaboration.”
          </p>
        </div>
        <div className="console-panels">
          <div className="execution-timeline">
            <span className="technical">EXECUTION TIMELINE</span>
            <ol>
              {operations.map((operation, i) => (
                <li
                  key={operation}
                  className={
                    i < current ? "done" : i === current ? "current" : ""
                  }
                >
                  {i < current ? <Check size={12} /> : <Circle size={10} />}
                  <span>{operation}</span>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                </li>
              ))}
            </ol>
          </div>
          <div className="operation-panel">
            <span className="technical">CURRENT OPERATION</span>
            <div className="operation-emblem" aria-hidden="true">
              <span>
                {complete ? (
                  <Check size={28} />
                ) : (
                  String(current + 1).padStart(2, "0")
                )}
              </span>
            </div>
            <h3>{complete ? "Ready to ship" : operations[current]}</h3>
            <p>
              {complete
                ? "Artifacts prepared. The next step is a human-reviewed deployment."
                : "The engine carries the requirements forward, connecting each operation to a reviewable artifact."}
            </p>
            <div className="artifact">
              <span>{artifacts[Math.min(current, artifacts.length - 1)]}</span>
            </div>
            <div
              className="run-progress"
              role="progressbar"
              aria-label="Illustrative engineering progress"
              aria-valuemin={0}
              aria-valuemax={12}
              aria-valuenow={current}
            >
              <span style={{ width: `${(current / 12) * 100}%` }} />
            </div>
            <small>{current} / 12 operations illustrated</small>
          </div>
          <div className="run-preview">
            <span className="technical">APPLICATION PREVIEW</span>
            <SupportPreview />
            <p>Illustrative interface · no project is generated</p>
          </div>
        </div>
        <p className="sr-only" role="status">
          {complete
            ? "Demonstration complete. Ready to ship."
            : running
              ? `Current operation: ${operations[current]}`
              : "Demonstration paused."}
        </p>
      </div>
    </StorySection>
  );
}
