import type { ProjectSource } from './project-export';
/** Prepared starter, deliberately separate from the recorded Gemini-generated public examples. */
export const starterProject: ProjectSource = {
  app: `import React, { useState } from 'react';
interface Task { id: number; title: string; done: boolean }
export default function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Write down your first idea', done: true },
    { id: 2, title: 'Try this interactive preview', done: false },
    { id: 3, title: 'Make something your own', done: false },
  ]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('All');
  const complete = tasks.filter(task => task.done).length;
  const visible = tasks.filter(task => filter === 'All' || (filter === 'Done' ? task.done : !task.done));
  return <main className="focus-app">
    <header><span className="brand">◈ DAYONE</span><span className="edition">A little space for your next big thing.</span></header>
    <section className="intro"><span className="label">YOUR PERSONAL WORKSPACE</span><h1>Make room<br/>for progress.</h1><p>One clear task. One small step. A better day.</p></section>
    <section aria-label="Task manager" className="task-panel">
      <div className="panel-title"><h2>Today's focus</h2><span>{complete} of {tasks.length} done</span></div>
      <progress aria-label="Task completion" value={complete} max={tasks.length || 1}/>
      <form onSubmit={event => { event.preventDefault(); if (title.trim()) { setTasks([...tasks, {id: Date.now(), title: title.trim(), done: false}]); setTitle(''); } }}>
        <label htmlFor="new-task">What's next?</label><div className="add-row"><input id="new-task" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Add a task…" required/><button>Add task</button></div>
      </form>
      <div className="filters" role="group" aria-label="Filter tasks">{['All','Open','Done'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
      <ul>{visible.map(task => <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => setTasks(tasks.map(item => item.id === task.id ? {...item, done: !item.done} : item))}/><span className={task.done ? 'completed' : ''}>{task.title}</span></label><button aria-label={'Delete ' + task.title} className="delete" onClick={() => setTasks(tasks.filter(item => item.id !== task.id))}>×</button></li>)}</ul>
      {!visible.length && <p className="empty">Nothing here. A fresh start.</p>}
    </section><footer>Made for a calmer kind of productivity. Sample data stays in this preview.</footer>
  </main>;
}`,
  css: `body{background:#f4f2ed;color:#223126;font-family:system-ui,sans-serif}.focus-app{max-width:780px;margin:auto;padding:28px 36px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:26px;border-bottom:1px solid #d9dfd3}.brand{font-weight:750;letter-spacing:.12em;font-size:17px}.edition{font-size:12px;color:#536151}.intro{padding:40px 0 32px}.label{font-size:11px;letter-spacing:.14em;font-weight:700;color:#53734e}.intro h1{font-size:clamp(36px,6vw,54px);line-height:1.05;letter-spacing:-.05em;font-weight:600;margin:15px 0}.intro p{font-size:16px;color:#596553}.task-panel{background:#fff;border:1px solid #dce0d5;border-radius:18px;padding:26px;box-shadow:0 8px 35px #263d2410}.panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.panel-title h2{font-size:20px;margin:0}.panel-title>span{font-size:13px;color:#536151}progress{width:100%;height:5px;accent-color:#467840;margin:20px 0 26px}form>label{display:block;font-size:13px;font-weight:600;margin-bottom:10px}.add-row{display:flex;gap:8px}input:not([type=checkbox]){width:100%;min-width:0;border:1px solid #cbd5c7;border-radius:8px;padding:12px;color:#223126;background:#fafbf7}button{border:0;background:#2d512b;color:#fff;border-radius:8px;padding:12px 16px;cursor:pointer;white-space:nowrap}.filters{display:flex;gap:8px;margin-top:24px}.filters button{background:transparent;color:#586353;padding:8px 14px;font-size:13px}.filters button[aria-pressed=true]{background:#edf3e8;color:#2d512b}ul{list-style:none;padding:0;margin:12px 0 0}li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #edf0e8}li label{display:flex;gap:12px;align-items:center;overflow-wrap:anywhere;font-size:15px}input[type=checkbox]{width:18px;height:18px;accent-color:#467840;flex-shrink:0}.completed{text-decoration:line-through;color:#64735f}.delete{background:transparent;color:#687764;font-size:21px;padding:5px 10px}.empty{color:#687764;font-size:14px}footer{padding:24px 0 0;font-size:11px;color:#687764;text-align:center}@media(max-width:480px){.focus-app{padding:20px}.edition{display:none}.intro{padding-top:28px}.task-panel{padding:18px}.add-row button{padding:12px}.panel-title>span{font-size:11px}}`,
};
