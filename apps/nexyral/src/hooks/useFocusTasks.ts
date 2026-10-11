import { useRef, useState, type SetStateAction } from "react";
export interface FocusTask {
  id: string;
  title: string;
  done: boolean;
  priority: "normal" | "high";
}
const key = "nexyral-focus-v1";
const seed: FocusTask[] = [
  {
    id: "brief",
    title: "Define the product's first useful feature",
    done: true,
    priority: "normal",
  },
  { id: "build", title: "Build the interface", done: false, priority: "high" },
  {
    id: "review",
    title: "Review keyboard and mobile behavior",
    done: false,
    priority: "normal",
  },
];
function load(): FocusTask[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      Array.isArray(stored) &&
      stored.length <= 100 &&
      stored.every(
        (task: unknown) =>
          typeof task === "object" &&
          task !== null &&
          "id" in task &&
          typeof task.id === "string" &&
          "title" in task &&
          typeof task.title === "string" &&
          task.title.trim().length > 0 &&
          task.title.length <= 120 &&
          "done" in task &&
          typeof task.done === "boolean" &&
          "priority" in task &&
          (task.priority === "normal" || task.priority === "high"),
      ) &&
      new Set(stored.map((task) => task.id)).size === stored.length
    )
      return stored;
  } catch {
    /* A blocked or invalid browser store must not prevent using the app. */
  }
  return seed;
}
export function useFocusTasks() {
  const [tasks, updateTasks] = useState<FocusTask[]>(load);
  const current = useRef(tasks);
  const [storageAvailable, setStorageAvailable] = useState(true);
  function setTasks(action: SetStateAction<FocusTask[]>) {
    const next =
      typeof action === "function" ? action(current.current) : action;
    current.current = next;
    updateTasks(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      setStorageAvailable(false);
    }
  }
  return { tasks, setTasks, storageAvailable, reset: () => setTasks(seed) };
}
