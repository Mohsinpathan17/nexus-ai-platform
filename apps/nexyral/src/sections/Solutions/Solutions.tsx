import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { StorySection } from "../../components/ui/StorySection";
import { audiences } from "../../lib/product-content";
export default function Solutions() {
  const [active, setActive] = useState(0);
  return (
    <StorySection
      id="solutions"
      index="10"
      label="DIFFERENT IDEAS. SHARED ENGINE."
      title={
        <>
          Built for people
          <br />
          <span>who build things.</span>
        </>
      }
    >
      <div className="solutions-layout">
        <div
          className="audience-selector"
          role="tablist"
          aria-label="Use cases"
        >
          {audiences.map(([name], i) => (
            <button
              role="tab"
              id={`audience-${i}`}
              aria-selected={active === i}
              tabIndex={active === i ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  [
                    "ArrowRight",
                    "ArrowLeft",
                    "ArrowDown",
                    "ArrowUp",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 3
                        : (i +
                            (["ArrowRight", "ArrowDown"].includes(event.key)
                              ? 1
                              : 3)) %
                          4;
                  setActive(next);
                  document.getElementById(`audience-${next}`)?.focus();
                }
              }}
              aria-controls="audience-panel"
              key={name}
              onClick={() => setActive(i)}
            >
              {name}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        <div
          className="audience-panel"
          role="tabpanel"
          id="audience-panel"
          aria-labelledby={`audience-${active}`}
        >
          <span className="technical">
            FOR {audiences[active][0].toUpperCase()}
          </span>
          <h3>{audiences[active][1]}</h3>
          <p>{audiences[active][2]}</p>
          <blockquote>{audiences[active][3]}</blockquote>
          <Link className="text-button" to="/solutions">
            Explore use cases <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </StorySection>
  );
}
