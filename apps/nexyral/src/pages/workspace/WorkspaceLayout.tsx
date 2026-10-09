import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, FolderKanban, LogOut } from "lucide-react";
import { Logo } from "../../components/ui/Primitives";
import ThemeControl from "../../components/ui/ThemeControl";
import { useAuth } from "../../app/auth-context";
import { errorMessage } from "../../lib/api";
import AccountConnections from "./AccountConnections";
export default function WorkspaceLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (auth.phase === "loading")
    return (
      <section className="workspace-loading">
        <h1>Loading your workspace…</h1>
      </section>
    );
  if (auth.phase === "unavailable")
    return (
      <section className="workspace-loading">
        <h1>Reconnect to your workspace.</h1>
        <p>
          The workspace service could not be reached. Your session has not been
          changed.
        </p>
        <button className="button" onClick={() => void auth.refresh()}>
          Try again
        </button>
        <Link to="/">Return to the website</Link>
      </section>
    );
  if (!auth.user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  async function logout() {
    setPending(true);
    try {
      await auth.logout();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="engineering-workspace">
      <header className="workspace-header">
        <Logo />
        <span className="technical">ENGINEERING WORKSPACE</span>
        <ThemeControl />
      </header>
      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-person">
            <span>{auth.user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{auth.user.name}</strong>
              <small>Personal workspace</small>
            </div>
          </div>
          <nav aria-label="Workspace navigation">
            <Link to="/workspace">
              <FolderKanban size={16} />
              Projects
            </Link>
            <Link to="/docs">
              <ArrowUpRight size={16} />
              Workflow guide
            </Link>
            <Link to="/">
              <ArrowUpRight size={16} />
              Public website
            </Link>
          </nav>
          <div className="worker-state">
            <i />
            <span>PLANNING / HUMAN REVIEW</span>
            <p>
              Run details show live worker availability. Frontend builds require owner approval and an enabled isolated executor. Nothing is deployed.
            </p>
          </div>
          <button
            className="logout-button"
            onClick={() => void logout()}
            disabled={pending}
          >
            <LogOut size={15} />
            {pending ? "Signing out…" : "Sign out"}
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </aside>
        <main id="main" className="workspace-main">
          <AccountConnections /><Outlet />
        </main>
      </div>
    </div>
  );
}
