import { ArrowUpRight, Code2, CheckCircle2 } from "lucide-react";
import { StorySection } from "../../components/ui/StorySection";
import { Button } from "../../components/ui/Primitives";
import FocusWorkspace from "../../components/examples/FocusWorkspace";
export default function Showcase() {
  return (
    <StorySection
      id="showcase"
      index="01"
      label="THE IDEA, MADE TANGIBLE"
      className="showcase-section"
      title={
        <>
          A brief. A real interface.
          <br />
          <span>Something you can use.</span>
        </>
      }
      description="Meet Focus: a working task workspace built for NEXYRAL. Add your next step, set its priority, and come back to it later."
    >
      <div className="showcase-intent">
        <span className="eyebrow">THE BRIEF</span>
        <p>
          “A calm workspace to organize my tasks and focus on what comes next.”
        </p>
        <span className="showcase-build-label">
          <CheckCircle2 size={15} /> Working reference app
        </span>
      </div>
      <FocusWorkspace />
      <div className="showcase-delivery">
        <div>
          <span>01 / INTERACT</span>
          <p>Add, search, complete, and delete tasks.</p>
        </div>
        <div>
          <span>02 / KEEP YOUR WORK</span>
          <p>Local saves and a downloadable task export.</p>
        </div>
        <div>
          <span>03 / INSPECT</span>
          <p>React + TypeScript. Read the actual source.</p>
        </div>
      </div>
      <div className="showcase-actions">
        <div>
          <Button to="/examples/focus">Open the full example</Button>
          <a
            className="showcase-source"
            href="/examples/focus-source.zip"
            download
          >
            <Code2 size={16} /> Download runnable source{" "}
            <ArrowUpRight size={15} />
          </a>
        </div>
        <p>
          Interactive reference app · Runs in your browser.
          <br />
          This example is not a recorded autonomous AI build.
        </p>
      </div>
    </StorySection>
  );
}
