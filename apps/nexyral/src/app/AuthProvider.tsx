import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Session } from "../../shared/contracts";
import { api } from "../lib/api";
import { AuthContext } from "./auth-context";
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    csrfToken: null,
  });
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable">(
    import.meta.env.VITE_PUBLIC_DEMO === "1" ||
      import.meta.env.VITE_SERVERLESS === "1"
      ? "ready"
      : "loading",
  );
  const update = useCallback((next: Session) => {
    setSession(next);
    setPhase("ready");
  }, []);
  const refresh = useCallback(async () => {
    try {
      if (import.meta.env.VITE_SERVERLESS === "1") {
        const { cloudAuth } = await import("../lib/cloud-auth");
        await cloudAuth?.currentUser?.reload();
        const user = cloudAuth?.currentUser;
        update({ user: user ? { id: user.uid, email: user.email ?? "", name: user.displayName ?? user.email ?? "Builder" } : null, csrfToken: null, emailVerified: user?.emailVerified });
        return;
      }
      update(await api<Session>("/auth/session"));
    } catch {
      setPhase("unavailable");
    }
  }, [update]);
  useEffect(() => {
    if (import.meta.env.VITE_SERVERLESS === "1") {
      let active = true;
      let unsubscribe: (() => void) | undefined;
      void Promise.all([import("../lib/cloud-auth"), import("firebase/auth")]).then(([{ cloudAuth }, { onAuthStateChanged }]) => {
        if (!active) return;
        if (!cloudAuth) { setPhase("unavailable"); return; }
        unsubscribe = onAuthStateChanged(cloudAuth, user => {
          update({ user: user ? { id: user.uid, email: user.email ?? "", name: user.displayName ?? user.email ?? "Builder" } : null, csrfToken: null, emailVerified: user?.emailVerified });
        });
      }).catch(() => { if (active) setPhase("unavailable"); });
      return () => { active = false; unsubscribe?.(); };
    }
    if (
      import.meta.env.VITE_PUBLIC_DEMO === "1" ||
      import.meta.env.VITE_SERVERLESS === "1"
    ) {
      return;
    }
    const controller = new AbortController();
    void api<Session>("/auth/session", { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) update(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase("unavailable");
      });
    const expired = () => update({ user: null, csrfToken: null });
    window.addEventListener("nexyral:session-expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("nexyral:session-expired", expired);
    };
  }, [update]);
  async function logout() {
    if (import.meta.env.VITE_SERVERLESS === "1") {
      const [{ cloudAuth }, { signOut }] = await Promise.all([import("../lib/cloud-auth"), import("firebase/auth")]);
      if (cloudAuth) await signOut(cloudAuth);
      update({ user: null, csrfToken: null });
      return;
    }
    await api("/auth/logout", {
      method: "POST",
      body: {},
      csrf: session.csrfToken,
    });
    update({ user: null, csrfToken: null });
  }
  return (
    <AuthContext.Provider
      value={{ ...session, phase, update, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
