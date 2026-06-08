/* global React */
// Maker Compass — App kit: shell primitives (Icon, Button, Input, Sidebar, TopBar)

const { useEffect, useRef } = React;

function Icon({ name, size = 18, className = "", style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size } });
    }
  }, [name, size]);
  return <span ref={ref} className={className} style={{ display: "inline-flex", lineHeight: 0, ...style }} />;
}

function Button({ variant = "primary", size = "default", children, className = "", ...props }) {
  return <button className={["ac-btn", `ac-btn--${variant}`, `ac-btn--${size}`, className].join(" ")} {...props}>{children}</button>;
}

const NAV = [
  { name: "Dashboard", icon: "layout-dashboard" },
  { name: "Projects", icon: "folder-kanban" },
  { name: "Billing", icon: "credit-card" },
  { name: "Preferences", icon: "settings" },
];

function Sidebar({ active, onNavigate, credits = 132 }) {
  return (
    <aside className="ac-sidebar">
      <div className="ac-sidebar__brand">
        <img src="../../assets/maker-compass-logo.svg" alt="" width="26" height="26" />
        <span>Maker Compass</span>
      </div>
      <nav className="ac-sidebar__nav">
        {NAV.map((item) => (
          <button
            key={item.name}
            className={`ac-navitem ${active === item.name ? "is-active" : ""}`}
            onClick={() => onNavigate(item.name)}
          >
            <Icon name={item.icon} size={18} />{item.name}
          </button>
        ))}
      </nav>
      <div className="ac-sidebar__credits">
        <div className="ac-credits">
          <div className="ac-credits__label"><Icon name="coins" size={14} style={{ color: "var(--warm-coral)" }} />Credits</div>
          <div className="ac-credits__num">{credits}</div>
        </div>
      </div>
      <div className="ac-sidebar__signout">
        <button className="ac-navitem ac-navitem--signout"><Icon name="log-out" size={18} />Sign out</button>
      </div>
    </aside>
  );
}

Object.assign(window, { Icon, Button, Sidebar });
