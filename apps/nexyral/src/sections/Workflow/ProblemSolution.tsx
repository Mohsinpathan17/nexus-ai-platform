import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { StorySection } from "../../components/ui/StorySection";
export default function ProblemSolution() {
  const [expanded, setExpanded] = useState(false);
  return (
    <StorySection
      id="problem"
      index="01"
      label="FROM FRAGMENTED TO CONNECTED"
      title={
        <>
          Your idea shouldn't get lost
          <br />
          <span>between the steps.</span>
        </>
      }
      description="Software takes more than a prompt. It takes a connected engineering process."
    >
      <div className="comparison">
        <div className="traditional-flow">
          <span className="technical">THE TRADITIONAL HANDOFF</span>
          <div>
            {[
              "Idea",
              "Requirements",
              "Design",
              "Code",
              "Debug",
              "Test",
              "Deploy",
            ].map((item, i) => (
              <span key={item}>
                <b>{item}</b>
                {i < 6 && <ArrowRight size={13} />}
              </span>
            ))}
          </div>
          <p>Context moves between tools. You connect the pieces.</p>
        </div>
        <div className="connected-flow">
          <span className="technical">THE NEXYRAL EXECUTION SYSTEM</span>
          <div className="simplified-flow">
            <span>IDEA</span>
            <ArrowRight />
            <button
              aria-expanded={expanded}
              aria-controls="internal-workflow"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="mini-core">N</span>NEXYRAL
              <ChevronDown size={14} />
            </button>
            <ArrowRight />
            <span>
              WORKING
              <br />
              SOFTWARE
            </span>
          </div>
          <div
            id="internal-workflow"
            className="internal-flow"
            hidden={!expanded}
          >
            {["Understand", "Plan", "Build", "Verify", "Ship"].map(
              (item, i) => (
                <span key={item}>
                  <small>0{i + 1}</small>
                  {item}
                </span>
              ),
            )}
          </div>
          <p>
            One system carries intent through every stage.{" "}
            <button
              className="text-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Collapse the engine" : "Explore inside the engine"}{" "}
              <ArrowRight size={12} />
            </button>
          </p>
        </div>
      </div>
    </StorySection>
  );
}
