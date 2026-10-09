import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { StorySection } from "../../components/ui/StorySection";
import { capabilities } from "../../lib/product-content";
export default function Features() {
  return (
    <StorySection
      id="features"
      index="09"
      label="BUILT AS ONE SYSTEM"
      title={
        <>
          Every capability.
          <br />
          <span>One engineering context.</span>
        </>
      }
    >
      <div className="features-editorial">
        <div className="feature-primary">
          <span className="technical">THE CONNECTIVE LAYER</span>
          <div className="feature-orbit" aria-hidden="true">
            <span>N</span>
            <i />
            <i />
          </div>
          <h3>{capabilities[0][0]}</h3>
          <p>{capabilities[0][1]}</p>
          <Link className="text-button" to="/product">
            Explore the product <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="feature-list">
          {capabilities.slice(1).map(([name, detail], i) => (
            <div key={name}>
              <span>0{i + 2}</span>
              <div>
                <h3>{name}</h3>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StorySection>
  );
}
