import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="NEXYRAL home">
      <span className="logo-symbol" aria-hidden="true">
        N
      </span>
      NEXYRAL<span className="logo-dot">®</span>
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
