import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./theme-context";
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const value = localStorage.getItem("nexyral-theme");
      return value === "light" || value === "dark" ? value : "system";
    } catch {
      return "system";
    }
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    try {
      localStorage.setItem("nexyral-theme", theme);
    } catch {
      /* Storage may be unavailable. */
    }
  }, [theme, resolved]);
  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
