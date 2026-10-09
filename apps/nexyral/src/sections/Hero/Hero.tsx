import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Play, Command } from "lucide-react";
import { Button } from "../../components/ui/Primitives";
const NexyralCore = lazy(
  () => import("../../components/3d/nexyral-core/NexyralCore"),
);
export default function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-topline">
        <span>THE AUTONOMOUS ENGINEERING PLATFORM</span>
        <span className="edition">INTELLIGENCE, IN MOTION. / 001</span>
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
            NEXYRAL transforms natural-language intent into engineered, tested
            and deployable software.
          </p>
          <div className="hero-buttons">
            <Button to="/get-started">Start Building</Button>
            <a className="watch-link" href="#watch">
              <span>
                <Play size={12} fill="currentColor" />
              </span>
              Watch the 30-second walkthrough
            </a>
          </div>
          <div className="hero-note">
            <Command size={13} /> Your vision. An entire engineering workflow.
          </div>
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
