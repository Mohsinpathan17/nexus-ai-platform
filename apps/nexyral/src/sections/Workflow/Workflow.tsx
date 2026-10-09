import { useState } from "react";
import { Check, FileText } from "lucide-react";
import { StorySection } from "../../components/ui/StorySection";
import { workflow } from "../../lib/product-content";
export default function Workflow() {
  const [active, setActive] = useState(0);
  const stage = workflow[active];
  return (
    <StorySection
      id="how-it-works"
      index="02"
      label="THE ENGINEERING LOOP"
      title={
        <>
          An engineering system,
          <br />
          <span>not another chatbot.</span>
        </>
      }
    >
      <div className="workflow-story">
        <div
          className="workflow-stages"
          role="tablist"
          aria-label="How NEXYRAL works"
          aria-orientation="vertical"
        >
          {workflow.map((item, i) => (
            <button
              key={item.name}
              id={`workflow-tab-${i}`}
              role="tab"
              aria-controls="workflow-panel"
              aria-selected={active === i}
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(event) => {
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 4
                        : (i + (event.key === "ArrowDown" ? 1 : 4)) % 5;
                  setActive(next);
                  document.getElementById(`workflow-tab-${next}`)?.focus();
                }
              }}
            >
              <span>0{i + 1}</span>
              <b>{item.name}</b>
              <i />
            </button>
          ))}
        </div>
        <div
          className="workflow-panel"
          id="workflow-panel"
          role="tabpanel"
          aria-labelledby={`workflow-tab-${active}`}
        >
          <div className="blueprint-mark" aria-hidden="true">
            <div />
            <div />
            <span>0{active + 1}</span>
          </div>
          <span className="technical">
            EXECUTION STAGE / {stage.name.toUpperCase()}
          </span>
          <h3>{stage.title}</h3>
          <p>{stage.description}</p>
          <ul>
            {stage.output.map((item) => (
              <li key={item}>
                <Check size={14} />
                {item}
              </li>
            ))}
          </ul>
          <div className="artifact">
            <FileText size={15} />
            <span>{stage.artifact}</span>
            <span>ILLUSTRATIVE OUTPUT</span>
          </div>
        </div>
      </div>
    </StorySection>
  );
}
