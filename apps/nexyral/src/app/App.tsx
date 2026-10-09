import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import Footer from "../components/navigation/Footer";
import Home from "../pages/Home";
import ContentPage from "../pages/ContentPage";
import RecoverPage from "../pages/RecoverPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import AuthPage from "../pages/AuthPage";
import WorkspaceLayout from "../pages/workspace/WorkspaceLayout";
import ProjectsPage from "../pages/workspace/ProjectsPage";
import ProjectPage from "../pages/workspace/ProjectPage";
import RunPage from "../pages/workspace/RunPage";
import PlannedPage from "../pages/PlannedPage";
const EmailAction = lazy(() => import("../pages/EmailAction"));
const CloudStudio = lazy(() => import("../pages/CloudStudio"));
export default function App() {
  const location = useLocation();
  useEffect(() => {
    const target = location.hash
      ? document.getElementById(location.hash.slice(1))
      : null;
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    document.title =
      location.pathname === "/"
        ? "NEXYRAL — From Intent to Execution."
        : `NEXYRAL — ${location.pathname.slice(1).replaceAll("-", " ")}`;
  }, [location.pathname, location.hash]);
  if (
    import.meta.env.VITE_SERVERLESS === "1" &&
    ["/workspace", "/login", "/get-started", "/recover", "/verify-email", "/auth/action"].some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`),
    )
  )
    return (
      <>
        <a className="skip-link" href="#main">
          Skip to workspace
        </a>
        <Navbar />
        <main id="main">
          <Suspense fallback={<p className="container">Loading workspace…</p>}>
            {location.pathname === "/auth/action" ? <EmailAction /> : <CloudStudio />}
          </Suspense>
        </main>
        <Footer />
      </>
    );
  if (
    location.pathname === "/workspace" ||
    location.pathname.startsWith("/workspace/")
  )
    return (
      <>
        <a className="skip-link" href="#main">
          Skip to workspace
        </a>
        <Routes>
          <Route path="/workspace" element={<WorkspaceLayout />}>
            <Route index element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectPage />} />
            <Route path="runs/:runId" element={<RunPage />} />
            <Route path="*" element={<PlannedPage />} />
          </Route>
        </Routes>
      </>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recover" element={<RecoverPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/get-started" element={<AuthPage signup />} />
          {[
            "product",
            "how-it-works",
            "features",
            "solutions",
            "pricing",
            "docs",
            "about",
            "contact",
            "status",
          ].map((path) => (
            <Route key={path} path={`/${path}`} element={<ContentPage />} />
          ))}
          <Route path="*" element={<PlannedPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
