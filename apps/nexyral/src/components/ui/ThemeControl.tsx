import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../app/theme-context";
export default function ThemeControl() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="theme-control">
      <span className="sr-only">Color theme</span>
      {theme === "system" ? (
        <Monitor size={16} />
      ) : theme === "light" ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) =>
          setTheme(event.target.value as "system" | "light" | "dark")
        }
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
