import { useState } from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { StatusIndicator } from "../../components/ui/Primitives";
import { stages } from "../../components/3d/nexyral-core/core.config";
const details = [
  "Turn an idea into clear requirements, constraints, and acceptance criteria.",
  "Map the architecture, dependencies, and a reviewable implementation plan.",
  "Create components and connect the pieces into a coherent application.",
  "Check the build, types, tests, and the behavior that actually matters.",
  "Prepare deployment artifacts and put the final release in your hands.",
];
export default function EngineStrip() {
  const [active, setActive] = useState(0);
  return (
    <section id="engine" className="engine-section">
      <div className="container">
        <div className="engine-meta">
          <div>
            <span className="technical">NEXYRAL ENGINE</span>
            <StatusIndicator>INTERACTIVE SYSTEM PREVIEW</StatusIndicator>
          </div>
          <span className="technical">
            ONE CONNECTED WORKFLOW <ArrowRight size={13} />
          </span>
        </div>
        <div
          className="pipeline"
          role="tablist"
          aria-label="Engineering stages"
        >
          {stages.map((stage, index) => (
            <button
              key={stage}
              id={`stage-${index}`}
              role="tab"
              aria-selected={active === index}
              aria-controls="stage-detail"
              tabIndex={active === index ? 0 : -1}
              className={active === index ? "active" : ""}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 4
                        : (index + (event.key === "ArrowRight" ? 1 : 4)) % 5;
                  setActive(next);
                  document.getElementById(`stage-${next}`)?.focus();
                }
              }}
            >
              <span className="stage-number">0{index + 1}</span>
              <span>{stage}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <div
          id="stage-detail"
          role="tabpanel"
          aria-labelledby={`stage-${active}`}
          className="pipeline-detail"
        >
          <Check size={15} />
          <p>{details[active]}</p>
          <span>INTENT → OUTCOME</span>
        </div>
      </div>
    </section>
  );
}
