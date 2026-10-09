import { createContext, useContext } from "react";
export type Theme = "system" | "light" | "dark";
export const ThemeContext = createContext<{
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}>({ theme: "system", resolved: "dark", setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);
