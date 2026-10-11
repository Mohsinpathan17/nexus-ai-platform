import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Play, Check } from "lucide-react";

const NexyralCore = lazy(
  () => import("../../components/3d/nexyral-core/NexyralCore"),
);
export default function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-topline">
        <span>AI APP BUILDER</span>
        <span className="edition">EARLY ACCESS / FREE TO BUILD</span>
      </div>
      <div className="hero-layout">
        <motion.div
          className="hero-copy"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.7 }}
        >
          <div className="eyebrow">
            <span className="little-line" /> FROM INTENT TO EXECUTION.
          </div>
          <h1 id="hero-title">
            Describe an app.
            <br />
            <span>AI writes the code.</span>
          </h1>
          <p>
            Tell NEXYRAL what you want to make. It creates the screens and code
            for a web app. Try it in your browser, ask for changes in plain English, and keep the source.
          </p>
          <div className="hero-buttons">
            <a className="button" href="#start">Describe your app <ArrowUpRight size={17}/></a>
            <a className="watch-link" href="#watch" aria-label="Watch the 30-second walkthrough">
              <span>
                <Play size={12} fill="currentColor" />
              </span>
              Watch it work <small>30 sec</small>
            </a>
          </div>
          <div className="hero-note">
            <Check size={15} /> Free early access. No credit card required.
          </div>
          <a className="hero-example-link" href="#showcase">Try the AI-built apps <ArrowUpRight size={15} /></a>
        </motion.div>
        <div className="hero-visual">
          <div className="core-halo" />
          <div className="visual-coordinate coordinate-top">
            THE NEXYRAL CORE<span>01 — 05</span>
          </div>
          <Suspense
            fallback={<div className="core-loading">INITIALIZING CORE</div>}
          >
            <NexyralCore />
          </Suspense>
          <div className="visual-coordinate coordinate-bottom">
            <span className="core-cross">+</span> OUR WORKFLOW, VISUALIZED
            <span>HUMAN-DIRECTED</span>
          </div>
        </div>
      </div>
      <div className="hero-bottom">
        <span>DESCRIBE → GENERATE → TRY</span>
        <a href="#start" aria-label="Start describing an app">
          <ArrowDown size={16} />
        </a>
        <span>YOUR IDEA. YOUR SOURCE CODE.</span>
      </div>
    </section>
  );
}
