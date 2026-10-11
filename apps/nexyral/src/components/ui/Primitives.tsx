import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="NEXYRAL home">
      <span className="logo-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" width="32" height="32"><path d="M4 27 11 5l10 22 7-22" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /><path d="m4 27 4-12" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" /></svg>
      </span>
      NEXYRAL
    </Link>
  );
}
export function Button({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "button-secondary" : ""}`} to={to}>
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function StatusIndicator({ children }: { children: React.ReactNode }) {
  return (
    <span className="status">
      <i />
      {children}
    </span>
  );
}
