import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Play, Check } from "lucide-react";
import { Button } from "../../components/ui/Primitives";
const NexyralCore = lazy(
  () => import("../../components/3d/nexyral-core/NexyralCore"),
);
export default function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-topline">
        <span>THE AI SOFTWARE STUDIO</span>
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
            <span className="little-line" /> IDEAS DESERVE TO EXIST.
          </div>
          <h1 id="hero-title">
            From Intent
            <br />
            to <span>Execution.</span>
          </h1>
          <p>
            Turn your idea into React and TypeScript frontend source with AI.
            Review it, download it, and make it your own.
          </p>
          <div className="hero-buttons">
            <Button to="/get-started">Start Building</Button>
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
            NX / CORE SYSTEM<span>01 — 05</span>
          </div>
          <Suspense
            fallback={<div className="core-loading">INITIALIZING CORE</div>}
          >
            <NexyralCore />
          </Suspense>
          <div className="visual-coordinate coordinate-bottom">
            <span className="core-cross">+</span> AUTONOMOUS EXECUTION ENGINE
            <span>HUMAN-DIRECTED</span>
          </div>
        </div>
      </div>
      <div className="hero-bottom">
        <span>LESS FRICTION. MORE FORWARD.</span>
        <a href="#engine" aria-label="Explore the engineering pipeline">
          <ArrowDown size={16} />
        </a>
        <span>BUILT TO GO BEYOND GENERATION</span>
      </div>
    </section>
  );
}
