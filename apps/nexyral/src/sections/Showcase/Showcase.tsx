import { useState } from "react";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { StorySection } from "../../components/ui/StorySection";
import { Button } from "../../components/ui/Primitives";

interface Task { id: number; title: string; done: boolean }
const initialTasks: Task[] = [
  { id: 1, title: "Define the product's first useful feature", done: true },
  { id: 2, title: "Build the interface", done: false },
  { id: 3, title: "Review keyboard and mobile behavior", done: false },
];
export default function Showcase() {
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const visibleTasks = tasks.filter(task => filter === "all" || (filter === "done" ? task.done : !task.done));
  const complete = tasks.filter(task => task.done).length;
  return <StorySection id="showcase" index="01" label="AN IDEA YOU CAN INTERACT WITH" title={<>Don't just imagine it.<br /><span>Try something real.</span></>} description="A small, working frontend example, built for this website. Add a task, mark it complete, and explore the interface. Your changes stay in this demo until you reload.">
    <div className="showcase-layout">
      <div className="showcase-brief">
        <span className="eyebrow">THE INTENT</span>
        <blockquote>“Build a clean task workspace that helps me focus on what matters next.”</blockquote>
        <div className="showcase-stack"><span>REACT</span><span>TYPESCRIPT</span><span>RESPONSIVE</span></div>
        <p>This example runs in your browser. It demonstrates interface behavior; it is not evidence of an autonomous engineering run.</p>
        <Button to="/get-started">Build your own idea</Button>
      </div>
      <article className="focus-app" aria-labelledby="focus-app-title">
        <header><span className="focus-brand"><span aria-hidden="true">F</span> Focus</span><span className="focus-demo-label">INTERACTIVE EXAMPLE <ArrowUpRight size={13} aria-hidden="true" /></span></header>
        <div className="focus-body">
          <span className="eyebrow">LESS NOISE. MORE PROGRESS.</span>
          <h3 id="focus-app-title">Make room for good work.</h3>
          <p className="focus-progress" aria-live="polite">{complete} of {tasks.length} tasks complete</p>
          <div className="focus-progress-track" aria-hidden="true"><div style={{ width: `${tasks.length ? complete / tasks.length * 100 : 0}%` }} /></div>
          <form onSubmit={event => { event.preventDefault(); const title = draft.trim(); if (!title || tasks.length >= 25) return; setTasks(current => [...current, {id: Date.now(), title, done: false}]); setDraft(""); }}>
            <label className="sr-only" htmlFor="focus-task">New demo task</label>
            <input id="focus-task" value={draft} onChange={event => setDraft(event.target.value)} maxLength={120} placeholder="What will you work on next?" disabled={tasks.length >= 25} />
            <button type="submit" disabled={!draft.trim() || tasks.length >= 25} aria-label="Add demo task"><Plus size={20} aria-hidden="true" /></button>
          </form>
          <div className="focus-filters" role="group" aria-label="Filter demo tasks">{(["all", "open", "done"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All tasks" : value === "open" ? "In progress" : "Complete"}</button>)}</div>
          <ul className="focus-tasks">{visibleTasks.map(task => <li key={task.id} className={task.done ? "is-done" : ""}><label><input type="checkbox" checked={task.done} onChange={() => setTasks(current => current.map(item => item.id === task.id ? {...item, done: !item.done} : item))} /><span className="focus-check" aria-hidden="true">{task.done && <Check size={13} />}</span><span>{task.title}</span></label></li>)}</ul>
          {visibleTasks.length === 0 && <p className="focus-empty">No tasks in this view.</p>}
          <footer><span>{tasks.length >= 25 ? "Demo task capacity reached" : "Small steps. Clear progress."}</span><button type="button" onClick={() => {setTasks(initialTasks); setDraft(""); setFilter("all");}}>Reset demo</button></footer>
        </div>
      </article>
    </div>
  </StorySection>;
}
