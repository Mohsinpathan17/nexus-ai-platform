import { Link } from "react-router-dom";
import { Logo } from "../ui/Primitives";
const currentYear = new Date().getFullYear();
const groups: Record<string, string[][]> = {
  Product: [
    ["Overview", "product"],
    ["Features", "features"],
    ["Pricing", "pricing"],
    ["How It Works", "how-it-works"],
  ],
  Solutions: [
    ["For startups", "solutions"],
    ["For developers", "solutions"],
    ["For teams", "solutions"],
  ],
  Resources: [
    ["Documentation", "docs"],
    ["Status", "status"],
  ],
  Company: [
    ["About", "about"],
    ["Contact", "contact"],
  ],
  Legal: [
    ["Privacy", "privacy"],
    ["Terms", "terms"],
  ],
};
export default function Footer() {
  return (
    <footer className="container footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p>From Intent to Execution.</p>
        </div>
        {Object.entries(groups).map(([group, links]) => (
          <nav aria-label={group} key={group}>
            <h3>{group}</h3>
            {links.map(([label, path]) => (
              <Link key={label} to={`/${path}`}>
                {label}
              </Link>
            ))}
            {group === "Resources" && <a href="https://github.com/Mohsinpathan17/nexus-ai-platform" target="_blank" rel="noopener noreferrer">GitHub repository ↗</a>}
          </nav>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {currentYear} NEXYRAL</span>
        <span>ENGINEER THE POSSIBLE.</span>
      </div>
    </footer>
  );
}
