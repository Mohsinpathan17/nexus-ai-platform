import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import ThemeControl from "../ui/ThemeControl";
import { useAuth } from "../../app/auth-context";
import { Button, Logo } from "../ui/Primitives";
const links = [
  ["Product", "/product"],
  ["How It Works", "/how-it-works"],
  ["Features", "/features"],
  ["Solutions", "/solutions"],
  ["Pricing", "/pricing"],
];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const [menuPath, setMenuPath] = useState(location.pathname);
  const menuOpen = open && menuPath === location.pathname;
  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 16);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, path]) => (
            <Link key={path} to={path}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeControl />
          <Link className="sign-in" to={user ? "/workspace" : "/login"}>
            {user ? "Workspace" : "Sign In"}
          </Link>
          <span className="desktop-cta">
            <Button to="/get-started">Get Started</Button>
          </span>
          <button
            className="menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => {
              setMenuPath(location.pathname);
              setOpen(!menuOpen);
            }}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {links.map(([label, path]) => (
            <Link key={path} to={path}>
              {label}
            </Link>
          ))}
          <Link to={user ? "/workspace" : "/login"}>
            {user ? "Workspace" : "Sign In"}
          </Link>
          <Button to="/get-started">Get Started</Button>
        </nav>
      )}
    </header>
  );
}
