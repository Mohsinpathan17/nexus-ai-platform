import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
export function useResource<T>(path: string) {
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: string | null;
  }>({ path, data: null, error: null });
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await api<T>(path, { signal });
        if (!signal?.aborted) setState({ path, data, error: null });
      } catch (error) {
        if (!signal?.aborted)
          setState({ path, data: null, error: errorMessage(error) });
      }
    },
    [path],
  );
  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, data: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [path]);
  const refresh = useCallback(() => load(), [load]);
  const current =
    state.path === path ? state : { path, data: null, error: null };
  return { ...current, loading: !current.data && !current.error, refresh };
}
