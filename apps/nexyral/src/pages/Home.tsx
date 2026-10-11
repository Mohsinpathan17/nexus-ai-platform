import GettingStarted from "../sections/GettingStarted/GettingStarted";
import Questions from "../sections/Questions/Questions";
import Showcase from "../sections/Showcase/Showcase";
import Hero from "../sections/Hero/Hero";
import EngineStrip from "../sections/Engine/EngineStrip";
import ProblemSolution from "../sections/Workflow/ProblemSolution";
import Workflow from "../sections/Workflow/Workflow";
import BuildDemo from "../sections/BuildDemo/BuildDemo";
import Workspace from "../sections/Product/Workspace";
import Intelligence from "../sections/Intelligence/Intelligence";
import SelfRepair from "../sections/Repair/SelfRepair";
import Verification from "../sections/Verification/Verification";
import Deployment from "../sections/Deployment/Deployment";
import Features from "../sections/Features/Features";
import Solutions from "../sections/Solutions/Solutions";
import Pricing from "../sections/Pricing/Pricing";
import FinalCTA from "../sections/FinalCTA/FinalCTA";
export default function Home() {
  return (
    <>
      <Hero />
      <GettingStarted />
      <Showcase />
      <BuildDemo />
      <Questions />
      <details className="engineering-disclosure">
        <summary className="container"><span>FOR THE CURIOUS</span><strong>Explore the engineering vision</strong><small>How the engine, project memory, and verification fit together</small></summary>
        <p className="container engineering-context">These interactive sections explain NEXYRAL’s product direction. They illustrate workflows beyond the frontend generation available today.</p>
      <EngineStrip />
      <ProblemSolution />
      <Workflow />
      <Workspace />
      <Intelligence />
      <SelfRepair />
      <Verification />
      <Deployment />
      <Features />
      <Solutions />
      <Pricing />
      </details>
      <FinalCTA />
    </>
  );
}
