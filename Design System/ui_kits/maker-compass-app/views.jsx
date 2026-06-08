/* global React, Icon, Button */
// Maker Compass — App kit: views (Projects, Intake, Workspace)

const { useState, useRef, useEffect } = React;

/* ===== Projects ========================================================= */
function ProjectCard({ project, onOpen, onDelete }) {
  return (
    <div className="ac-pcard-wrap">
      <button className="ac-pcard" onClick={() => onOpen(project)}>
        <div>
          <h3 className="ac-pcard__name">{project.name}</h3>
          <p className="ac-pcard__desc">{project.description}</p>
        </div>
        <div className="ac-pcard__meta">Created {project.created}</div>
      </button>
      <button className="ac-pcard__del" aria-label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}>
        <Icon name="trash-2" size={15} />
      </button>
    </div>
  );
}

function ProjectsView({ projects, onOpen, onNew, onDelete }) {
  return (
    <div className="ac-page">
      <div className="ac-pagehead">
        <div>
          <span className="mc-label">Workspace</span>
          <h1 className="ac-pagehead__title">Projects</h1>
          <p className="ac-pagehead__desc">Manage the ideas, plans, and generated artifacts you are actively shaping.</p>
        </div>
        <Button variant="primary" onClick={onNew}><Icon name="plus" size={16} />New Project</Button>
      </div>
      {projects.length === 0 ? (
        <div className="ac-empty">
          <p className="ac-empty__title">No projects yet.</p>
          <p className="ac-empty__sub">Create your first idea to get started.</p>
          <Button variant="primary" onClick={onNew} style={{ marginTop: 16 }}>New Project</Button>
        </div>
      ) : (
        <div className="ac-grid">
          {projects.map((p) => <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

/* ===== Idea intake ====================================================== */
function IntakeView({ onCancel, onGenerate }) {
  const [idea, setIdea] = useState("");
  const [users, setUsers] = useState("");
  const [constraints, setConstraints] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!idea.trim() || busy) return;
    setBusy(true);
    const name = idea.trim().split(/[.,\n]/)[0].slice(0, 42);
    setTimeout(() => onGenerate({ name: name || "Untitled idea", description: idea.trim() }), 1400);
  };

  return (
    <div className="ac-page ac-intake">
      <button className="ac-back" onClick={onCancel}><Icon name="arrow-left" size={15} />Projects</button>
      <span className="mc-label">New project</span>
      <h1 className="ac-pagehead__title">Describe what you want to build</h1>
      <p className="ac-pagehead__desc">Share your idea, target users, and constraints in plain language. Maker Compass turns it into research, a plan, and mockups.</p>

      <form className="ac-form" onSubmit={submit}>
        <div className="ac-field">
          <label>Your idea</label>
          <textarea
            className="ac-textarea"
            rows={4}
            placeholder="A weekend tool that turns a one-line idea into a buildable plan for indie hackers…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            autoFocus
          />
        </div>
        <div className="ac-field-row">
          <div className="ac-field">
            <label>Target users</label>
            <input className="ac-input" placeholder="Indie founders, solo builders" value={users} onChange={(e) => setUsers(e.target.value)} />
          </div>
          <div className="ac-field">
            <label>Constraints (optional)</label>
            <input className="ac-input" placeholder="Ship in a weekend, no budget" value={constraints} onChange={(e) => setConstraints(e.target.value)} />
          </div>
        </div>
        <div className="ac-form__actions">
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? <><Icon name="loader" size={16} className="ac-spin" />Generating…</> : <>Generate plan <Icon name="arrow-right" size={16} /></>}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ===== Workspace ======================================================== */
const TABS = ["Competitive", "PRD", "MVP Plan", "Tech Spec"];

const ARTIFACTS = {
  Competitive: {
    kicker: "Competitive Analysis",
    title: "Where this idea wins",
    blocks: [
      { h: "Market snapshot", p: "Three incumbents own the structured-planning space, but all of them optimize for teams, not solo builders. The wedge is speed and single-session output: a builder lands with a vague idea and leaves with artifacts a coding agent can act on." },
      { table: { head: ["Competitor", "Angle", "Gap"], rows: [["Notion AI", "General workspace", "No build-ready output"], ["Linear", "Issue tracking", "Starts after the plan exists"], ["v0 / Lovable", "UI generation", "Skips research + scope"]] } },
      { h: "First wedge", p: "Lead with the research-to-spec pipeline. Win the moment between \"I have an idea\" and \"I have something to build,\" which none of the incumbents address directly." },
    ],
  },
  PRD: {
    kicker: "Product Requirements",
    title: "First-version scope",
    blocks: [
      { h: "Problem", p: "Builders lose weeks to analysis paralysis and tool-switching before any code is written. The gap between idea and buildable spec is unstructured and lonely." },
      { h: "Goals", list: ["One intake produces every core artifact", "Output is written for builders, not slide decks", "Docs stay tied to a single project context"] },
      { h: "First version", p: "Intake → competitive scan → PRD → MVP plan → mockups → tech spec. Each artifact streams in and is editable inline. No real-time collaboration in v1." },
    ],
  },
  "MVP Plan": {
    kicker: "MVP Plan",
    title: "Build it this weekend",
    blocks: [
      { h: "Milestones", list: ["Intake form + project creation", "Streaming artifact generation", "Inline editing + export", "Handoff bundle for coding agents"] },
      { h: "Acceptance criteria", p: "A user with a one-line idea can finish the prep work in a single session and walk out with a PRD, an MVP plan, and mockups ready to hand to Cursor or Claude Code." },
    ],
  },
  "Tech Spec": {
    kicker: "Technical Blueprint",
    title: "Architecture at a glance",
    blocks: [
      { h: "Stack", p: "Next.js App Router on the edge, Supabase for auth + data, an LLM gateway for model routing, and streaming NDJSON for artifact generation." },
      { h: "Data model", list: ["projects — one per idea", "analyses — typed artifacts per project", "messages — assistant chat, scoped to project"] },
    ],
  },
};

function Artifact({ tab }) {
  const a = ARTIFACTS[tab];
  return (
    <article className="ac-doc">
      <span className="mc-label" style={{ color: "var(--text-muted)" }}>{a.kicker}</span>
      <h2 className="ac-doc__title">{a.title}</h2>
      {a.blocks.map((b, i) => (
        <div key={i} className="ac-doc__block">
          {b.h && <h3 className="ac-doc__h">{b.h}</h3>}
          {b.p && <p className="ac-doc__p">{b.p}</p>}
          {b.list && <ul className="ac-doc__list">{b.list.map((li) => <li key={li}>{li}</li>)}</ul>}
          {b.table && (
            <table className="ac-doc__table">
              <thead><tr>{b.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{b.table.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      ))}
    </article>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "I have your project context loaded. Ask me to refine the scope, draft a section, or pressure-test an assumption." },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.parentElement.scrollTop = endRef.current.offsetTop; }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: "Good call. I tightened that into the first-version scope and flagged the dependency in the MVP plan. Want me to regenerate the tech spec to match?" }]);
    }, 700);
  };

  return (
    <div className="ac-chat">
      <div className="ac-chat__head"><Icon name="message-square" size={15} />Assistant</div>
      <div className="ac-chat__scroll">
        {messages.map((m, i) => (
          <div key={i} className={`ac-msg ac-msg--${m.role}`}>
            {m.role === "assistant" && <span className="ac-msg__avatar"><img src="../../assets/maker-compass-logo.svg" alt="" width="16" /></span>}
            <div className="ac-msg__bubble">{m.content}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="ac-composer">
        <textarea
          rows={1}
          placeholder="Describe your business idea or ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="ac-composer__send" onClick={send} disabled={!input.trim()}><Icon name="arrow-up" size={16} /></button>
      </div>
    </div>
  );
}

function WorkspaceView({ project, onBack }) {
  const [tab, setTab] = useState("Competitive");
  return (
    <div className="ac-workspace">
      <div className="ac-wshead">
        <button className="ac-back" onClick={onBack}><Icon name="arrow-left" size={15} />Projects</button>
        <div className="ac-wshead__row">
          <h1 className="ac-wshead__title">{project.name}</h1>
          <span className="ac-status ac-status--done"><Icon name="check" size={12} />Generated</span>
        </div>
        <nav className="ac-tabs">
          {TABS.map((t) => (
            <button key={t} className={`ac-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </div>
      <div className="ac-wsbody">
        <div className="ac-wsdoc"><Artifact tab={tab} /></div>
        <ChatPanel />
      </div>
    </div>
  );
}

Object.assign(window, { ProjectsView, IntakeView, WorkspaceView });
