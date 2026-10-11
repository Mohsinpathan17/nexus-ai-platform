import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FocusWorkspace from "../components/examples/FocusWorkspace";
export default function FocusExample() {
  return (
    <section className="focus-example-page container">
      <Link to="/#showcase" className="example-back">
        <ArrowLeft size={16} /> Back to NEXYRAL
      </Link>
      <div className="example-page-heading">
        <span className="eyebrow">NEXYRAL / WORKING EXAMPLE</span>
        <h1>A little space to focus.</h1>
        <p>
          A working React workspace. Your tasks stay in this browser, without an
          account. Export them whenever you need.
        </p>
        <a
          className="showcase-source"
          href="/examples/focus-source.zip"
          download
        >
          Download runnable source ↗
        </a>
      </div>
      <FocusWorkspace />
      <p className="example-privacy">
        Data is stored locally on this device. It is not uploaded to NEXYRAL.
        Clear your tasks with Reset demo, or keep a copy with Export tasks.{" "}
        <a
          className="showcase-source"
          href="https://github.com/Mohsinpathan17/nexus-ai-platform/blob/main/apps/nexyral/src/components/examples/FocusWorkspace.tsx"
          target="_blank"
          rel="noopener noreferrer"
        >
          Inspect source on GitHub ↗
        </a>
      </p>
    </section>
  );
}
