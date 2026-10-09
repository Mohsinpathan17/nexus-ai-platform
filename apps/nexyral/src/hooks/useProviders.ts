import { useEffect, useState } from "react";
import { api } from "../lib/api";
interface Providers { github: boolean; email: boolean; supportEmail: string | null }
export function useProviders() {
  const [providers, setProviders] = useState<Providers>({ github: false, email: false, supportEmail: null });
  useEffect(() => {
    if (import.meta.env.VITE_PUBLIC_DEMO === "1" || import.meta.env.VITE_SERVERLESS === "1") return;
    const controller = new AbortController();
    void api<Providers>("/auth/providers", { signal: controller.signal }).then(setProviders).catch(() => { /* Never claim an unreachable provider is configured. */ });
    return () => controller.abort();
  }, []);
  return providers;
}
