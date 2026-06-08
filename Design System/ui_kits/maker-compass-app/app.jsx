/* global React, ReactDOM, Sidebar, ProjectsView, IntakeView, WorkspaceView */
// Maker Compass — App kit: shell + view routing

const { useState, useEffect } = React;

const SEED = [
  { id: 1, name: "Apex Revenue OS", description: "A CRM that surfaces qualified pipeline automatically and nudges reps toward the next best action.", created: "3 days ago" },
  { id: 2, name: "StayFlow Booking", description: "Instant-host onboarding for short-stay marketplaces. Cut setup time from days to minutes.", created: "1 week ago" },
  { id: 3, name: "Northstar Budget Suite", description: "Personal finance planner with retention alerts and a weekly money review built for builders.", created: "2 weeks ago" },
];

function App() {
  const [nav, setNav] = useState("Projects");      // sidebar section
  const [view, setView] = useState("projects");    // projects | intake | workspace
  const [projects, setProjects] = useState(SEED);
  const [current, setCurrent] = useState(null);
  let nextId = useState(() => ({ v: 100 }))[0];

  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const openProject = (p) => { setCurrent(p); setView("workspace"); };
  const deleteProject = (id) => setProjects((ps) => ps.filter((p) => p.id !== id));
  const generate = ({ name, description }) => {
    const p = { id: nextId.v++, name, description, created: "just now" };
    setProjects((ps) => [p, ...ps]);
    setCurrent(p);
    setView("workspace");
  };

  const handleNav = (section) => {
    setNav(section);
    if (section === "Projects" || section === "Dashboard") setView("projects");
  };

  return (
    <div className="ac-shell">
      <Sidebar active={nav} onNavigate={handleNav} />
      <main className="ac-main">
        {view === "projects" && (
          <ProjectsView projects={projects} onOpen={openProject} onNew={() => setView("intake")} onDelete={deleteProject} />
        )}
        {view === "intake" && (
          <IntakeView onCancel={() => setView("projects")} onGenerate={generate} />
        )}
        {view === "workspace" && current && (
          <WorkspaceView project={current} onBack={() => setView("projects")} />
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
