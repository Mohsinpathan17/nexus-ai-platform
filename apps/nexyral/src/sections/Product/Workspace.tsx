import { useState } from "react";
import { Check, ChevronRight, FileCode, Folder, GitBranch } from "lucide-react";
import { StorySection, DemoLabel } from "../../components/ui/StorySection";
import SupportPreview from "../../components/ui/SupportPreview";
const snippets: Record<string, string> = {
  "Inbox.tsx": `import { useTickets } from '@/lib/tickets';

export function Inbox() {
  const { tickets, assign } = useTickets();

  return (
    <TicketList
      items={tickets}
      onAssign={assign}
      aria-label="Team inbox"
    />
  );
}`,
  "tickets.ts": `export type Ticket = {
  id: string;
  subject: string;
  status: 'open' | 'resolved';
  assigneeId: string | null;
};

export async function getTickets() {
  const response = await api.get('/tickets');
  return ticketSchema.parse(response.data);
}`,
  "schema.sql": `CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX tickets_assignee_idx
  ON tickets (assignee_id);`,
};
export default function Workspace() {
  const [file, setFile] = useState("Inbox.tsx");
  return (
    <StorySection
      id="workspace"
      index="04"
      label="YOUR ENGINEERING WORKSPACE"
      title={
        <>
          The work is autonomous.
          <br />
          <span>The workspace is yours.</span>
        </>
      }
      description="Files, decisions, code, and the running interface. A single place to see what the system is building."
    >
      <DemoLabel />
      <div className="workspace">
        <div className="workspace-title">
          <strong>
            <span className="project-dot" />
            SupportOS
          </strong>
          <span>
            <GitBranch size={13} /> feature/team-inbox
          </span>
          <span>WORKSPACE CONCEPT</span>
        </div>
        <div className="workspace-layout">
          <aside className="file-tree" aria-label="Example project files">
            <span className="technical">FILES</span>
            <div>
              <ChevronRight size={12} />
              <Folder size={13} />
              src
            </div>
            {["components", "pages", "api", "lib"].map((folder) => (
              <div className="folder-indent" key={folder}>
                <Folder size={12} />
                {folder}
              </div>
            ))}
            {["Inbox.tsx", "tickets.ts"].map((name) => (
              <button
                key={name}
                className={file === name ? "selected" : ""}
                aria-pressed={file === name}
                onClick={() => setFile(name)}
              >
                <FileCode size={12} />
                {name}
              </button>
            ))}
            <div>
              <Folder size={13} />
              database
            </div>
            <button
              className={file === "schema.sql" ? "selected" : ""}
              aria-pressed={file === "schema.sql"}
              onClick={() => setFile("schema.sql")}
            >
              <FileCode size={12} />
              schema.sql
            </button>
          </aside>
          <div className="code-pane">
            <div className="code-tab">
              <FileCode size={13} />
              {file}
              <span>READ-ONLY PREVIEW</span>
            </div>
            <pre tabIndex={0} aria-label={`Example ${file} code`}>
              <code>
                {snippets[file].split("\n").map((line, i) => (
                  <span key={`${file}-${i}`}>
                    <i>{i + 1}</i>
                    {line || " "}
                  </span>
                ))}
              </code>
            </pre>
          </div>
          <div className="workspace-preview">
            <span className="technical">LIVE PREVIEW / CONCEPT</span>
            <SupportPreview />
          </div>
        </div>
        <div className="agent-panel">
          <span className="technical">
            <span className="signal-dot" /> NEXYRAL AGENT
          </span>
          {[
            "Analyzing architecture",
            "Editing 3 files",
            "Running validation",
            "Build successful",
          ].map((item) => (
            <span key={item}>
              <Check size={12} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </StorySection>
  );
}
