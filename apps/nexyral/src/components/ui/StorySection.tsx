import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
export function StorySection({
  id,
  index,
  label,
  title,
  description,
  children,
  className = "",
}: {
  id: string;
  index: string;
  label: string;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <section
      id={id}
      className={`story-section container ${className}`}
      aria-labelledby={`${id}-title`}
    >
      <motion.div
        className="story-heading"
        initial={reduced ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: reduced ? 0 : 0.45 }}
      >
        <span className="eyebrow">
          <span className="section-node" />
          {index} / {label}
        </span>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </motion.div>
      {children}
    </section>
  );
}
export function DemoLabel() {
  return (
    <span className="demo-label">
      PRODUCT DEMONSTRATION · ILLUSTRATIVE STATES
    </span>
  );
}
