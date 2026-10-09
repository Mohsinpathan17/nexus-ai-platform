import { Component, useEffect, useState, useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { stages, stageDescriptions } from "./core.config";
import { useTheme } from "../../../app/theme-context";
import NexyralScene from "./NexyralScene";
function Fallback() {
  return (
    <div className="core-fallback" aria-label="NEXYRAL computational core">
      <div />
      <div />
      <div />
      <span>N</span>
    </div>
  );
}
class CoreBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
export default function NexyralCore() {
  const reduced = useReducedMotion();
  const { resolved } = useTheme();
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [foreground, setForeground] = useState(() => !document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    if (container.current) observer.observe(container.current);
    const update = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const [supported] = useState(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    const available = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return available;
  });
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <div
      ref={container}
      className="core-canvas"

    >
      <div className="core-render" role="img" aria-label={`Computational core: ${stages[active]} stage selected`}>
      {supported ? (
        <CoreBoundary>
          <Canvas
            dpr={[1, mobile ? 1.25 : 1.75]}
            camera={{ position: [0, 0, 6.6], fov: 45 }}
            gl={{
              alpha: true,
              antialias: !mobile,
              powerPreference: "low-power",
            }}
            frameloop={reduced || !visible || !foreground ? "demand" : "always"}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <NexyralScene reduced={Boolean(reduced)} light={resolved === "light"} active={active} />
          </Canvas>
        </CoreBoundary>
      ) : (
        <Fallback />
      )}
      <div className="core-labels" aria-hidden="true">
        {stages.map((stage, index) => (
          <span key={stage} className={`node-label core-label label-${index}${active === index ? " is-active" : ""}`}>
            <b>0{index + 1}</b> {stage}
          </span>
        ))}
      </div>
      </div>
      <div className="core-controls">
        <span className="technical core-model-label">INTERACTIVE SYSTEM MODEL</span>
        <div className="core-stage-buttons" role="group" aria-label="Explore Core stages">
          {stages.map((stage, index) => <button key={stage} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span>{stage}</button>)}
        </div>
        <p aria-live="polite">{stageDescriptions[active]}</p>
      </div>
    </div>
  );
}
