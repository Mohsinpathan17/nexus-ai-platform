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
      <EngineStrip />
      <ProblemSolution />
      <Workflow />
      <BuildDemo />
      <Workspace />
      <Intelligence />
      <SelfRepair />
      <Verification />
      <Deployment />
      <Features />
      <Solutions />
      <Pricing />
      <FinalCTA />
    </>
  );
}
