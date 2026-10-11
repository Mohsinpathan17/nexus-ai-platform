import { useState } from "react";
import {
  Check,
  Plus,
  Search,
  Trash2,
  Download,
  Layers,
  Circle,
} from "lucide-react";
import { useFocusTasks } from "../../hooks/useFocusTasks";
export default function FocusWorkspace() {
  const { tasks, setTasks, storageAvailable, reset } = useFocusTasks();
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const complete = tasks.filter((task) => task.done).length;
  const visible = tasks.filter(
    (task) =>
      (filter === "all" || (filter === "done" ? task.done : !task.done)) &&
      task.title.toLowerCase().includes(search.toLowerCase()),
  );
  function exportTasks() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ name: "Focus", tasks }, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "focus-tasks.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Task export downloaded.");
  }
  return (
    <article className="focus-app" aria-labelledby="focus-app-title">
      <header>
        <span className="focus-brand">
          <span aria-hidden="true">F</span> Focus
          <span className="focus-version">WORKSPACE</span>
        </span>
        <span className="focus-demo-label">
          <i />{" "}
          {storageAvailable ? "Saved on this device" : "Temporary session"}
        </span>
      </header>
      <div className="focus-shell">
        <aside className="focus-sidebar">
          <span className="focus-sidebar-label">YOUR SPACE</span>
          <span className="focus-sidebar-active">
            <Layers size={16} /> My tasks <b>{tasks.length}</b>
          </span>
          <div className="focus-sidebar-note">
            <span className="focus-mini-mark">F</span>
            <strong>Less, but better.</strong>
            <p>One place for your next meaningful step.</p>
          </div>
        </aside>
        <div className="focus-body">
          <div className="focus-title-row">
            <div>
              <span className="eyebrow">A LITTLE MORE INTENTIONAL.</span>
              <h3 id="focus-app-title">My focus space</h3>
            </div>
            <button
              className="focus-export"
              type="button"
              onClick={exportTasks}
            >
              <Download size={15} /> <span>Export tasks</span>
            </button>
          </div>
          <div className="focus-metrics">
            <div>
              <span>In progress</span>
              <strong>
                {tasks.length - complete}
                <Circle size={14} />
              </strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>
                {complete}
                <Check size={16} />
              </strong>
            </div>
            <div>
              <span>High priority</span>
              <strong>
                {
                  tasks.filter((task) => task.priority === "high" && !task.done)
                    .length
                }
                <span className="focus-priority-dot" />
              </strong>
            </div>
          </div>
          <form
            className="focus-add-form"
            onSubmit={(event) => {
              event.preventDefault();
              const title = draft.trim();
              if (!title || tasks.length >= 100) return;
              setTasks((current) => [
                ...current,
                { id: crypto.randomUUID(), title, done: false, priority },
              ]);
              setDraft("");
              setNotice(`Added: ${title}`);
            }}
          >
            <label className="sr-only" htmlFor="focus-task">
              New demo task
            </label>
            <input
              id="focus-task"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={120}
              placeholder="What's your next meaningful step?"
              disabled={tasks.length >= 100}
            />
            <select
              aria-label="New task priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as "normal" | "high")
              }
            >
              <option value="normal">Normal</option>
              <option value="high">High priority</option>
            </select>
            <button
              type="submit"
              disabled={!draft.trim() || tasks.length >= 100}
              aria-label="Add demo task"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          </form>
          <div className="focus-toolbar">
            <div
              className="focus-filters"
              role="group"
              aria-label="Filter demo tasks"
            >
              {(["all", "open", "done"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "All tasks"
                    : value === "open"
                      ? "In progress"
                      : "Complete"}
                </button>
              ))}
            </div>
            <label className="focus-search">
              <Search size={15} aria-hidden="true" />
              <input
                aria-label="Search demo tasks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks"
              />
            </label>
          </div>
          <ul className="focus-tasks">
            {visible.map((task) => (
              <li key={task.id} className={task.done ? "is-done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      setTasks((current) =>
                        current.map((item) =>
                          item.id === task.id
                            ? { ...item, done: !item.done }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className="focus-check" aria-hidden="true">
                    {task.done && <Check size={13} />}
                  </span>
                  <span>{task.title}</span>
                </label>
                {task.priority === "high" && (
                  <span className="focus-priority-tag">High</span>
                )}
                <button
                  type="button"
                  className="focus-delete"
                  aria-label={`Delete task: ${task.title}`}
                  onClick={() => {
                    setTasks((current) =>
                      current.filter((item) => item.id !== task.id),
                    );
                    setNotice(`Deleted: ${task.title}`);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <div className="focus-empty">
              <Check size={24} />
              <strong>
                {search ? "No matching tasks." : "A clear space."}
              </strong>
              <p>
                {search
                  ? "Try another search or filter."
                  : "Add a task or choose a different view."}
              </p>
            </div>
          )}
          <footer>
            <span>
              {tasks.length >= 100
                ? "Example capacity reached (100 tasks)"
                : `${complete} of ${tasks.length} complete · ${storageAvailable ? "Saved locally" : "Storage unavailable"}`}
            </span>
            <button
              type="button"
              onClick={() => {
                reset();
                setDraft("");
                setFilter("all");
                setSearch("");
                setNotice("Example tasks restored.");
              }}
            >
              Reset demo
            </button>
          </footer>
          <p className="sr-only" role="status">
            {notice}
          </p>
        </div>
      </div>
    </article>
  );
}
