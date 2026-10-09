import { useState } from "react";
import { StorySection } from "../../components/ui/StorySection";
const memory = [
  [
    "Architecture",
    "React client, typed API, relational data. Changes remain connected to the architecture.",
  ],
  [
    "Project structure",
    "Components, pages, APIs, and tests are mapped to their responsibilities.",
  ],
  [
    "Dependencies",
    "Track why a dependency exists and which parts of the project rely on it.",
  ],
  [
    "Database",
    "Keep entity relationships and schema changes connected to application behavior.",
  ],
  [
    "Decisions",
    "Retain the rationale behind technical choices rather than only their final implementation.",
  ],
  [
    "Requirements",
    "Acceptance criteria stay attached to the features they describe.",
  ],
  ["History", "Previous modifications provide context for the next change."],
];
export default function Intelligence() {
  const [active, setActive] = useState(0);
  return (
    <StorySection
      id="intelligence"
      index="05"
      label="CONTEXT THAT CARRIES FORWARD"
      title={
        <>
          It doesn't just generate.
          <br />
          <span>It understands.</span>
        </>
      }
      description="A project is more than its latest prompt. NEXYRAL is designed to carry its structure, decisions, and history into the next change."
    >
      <div className="memory-layout">
        <div className="memory-graph">
          <svg viewBox="0 0 600 360" aria-hidden="true">
            {memory.map((_, i) => {
              const angle = (i / 7) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1="300"
                  y1="180"
                  x2={300 + Math.cos(angle) * 210}
                  y2={180 + Math.sin(angle) * 125}
                  className={active === i ? "selected" : ""}
                />
              );
            })}
          </svg>
          <div className="memory-center">
            <span className="mini-core">N</span>
            <strong>SupportOS</strong>
            <small>PROJECT CONTEXT</small>
          </div>
          {memory.map(([name], i) => {
            const angle = (i / 7) * Math.PI * 2;
            return (
              <button
                key={name}
                aria-pressed={active === i}
                className={`memory-node ${active === i ? "selected" : ""}`}
                style={{
                  left: `${50 + Math.cos(angle) * 35}%`,
                  top: `${50 + Math.sin(angle) * 35}%`,
                }}
                onClick={() => setActive(i)}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div className="memory-detail" aria-live="polite">
          <span className="technical">MEMORY / 0{active + 1}</span>
          <h3>{memory[active][0]}</h3>
          <p>{memory[active][1]}</p>
          <span className="context-link">CONTEXT → DECISION → CHANGE</span>
          <small>Illustrative project model</small>
        </div>
      </div>
    </StorySection>
  );
}
