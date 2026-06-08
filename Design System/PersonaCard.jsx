/* PersonaCard.jsx — Maker Compass user-persona card template.
   "The Builder's Workshop": tinted neutrals, one decisive Action-Red accent,
   Hanken Grotesk + Fira Mono, flat surfaces, hairline borders, gently rounded
   product register. Silhouettes are simple shapes; section icons are faithful
   Lucide paths. Exports PersonaCard to window. */

const { useEffect, useRef } = React;

/* ---- Faithful Lucide icon paths (stroke, 1.75) ------------------------- */
const ICON_PATHS = {
  user: <><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  compass: <><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></>,
};

function Icon({ name, size = 16, color = "currentColor", stroke = 1.75, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ---- Silhouettes — built from simple shapes (circle + rounded bust) ---- */
function Silhouette({ variant, color }) {
  const common = { fill: color };
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true"
      style={{ display: "block" }}>
      {variant === "female" ? (
        <>
          {/* hair: vertical capsule framing the head and falling past the jaw */}
          <rect x="28" y="18" width="44" height="58" rx="22" {...common} />
          {/* shoulders */}
          <path d="M17 100 C17 77 32 68 50 68 C68 68 83 77 83 100 Z" {...common} />
          {/* face sits on top, same fill (reads as the lit silhouette) */}
        </>
      ) : variant === "male" ? (
        <>
          <path d="M14 100 C14 73 31 64 50 64 C69 64 86 73 86 100 Z" {...common} />
          <circle cx="50" cy="35" r="20" {...common} />
        </>
      ) : (
        <>
          <path d="M17 100 C17 75 32 66 50 66 C68 66 83 75 83 100 Z" {...common} />
          <circle cx="50" cy="37" r="18" {...common} />
        </>
      )}
    </svg>
  );
}

/* ---- Avatar: circular, warm-paper well, thin red brand ring ------------ */
function Avatar({ variant, ring }) {
  const size = 104;
  const well = {
    width: size, height: size, borderRadius: "var(--radius-full)",
    background: "var(--warm-paper)",
    border: "1px solid var(--border-strong)",
    boxShadow: ring ? "0 0 0 3px var(--card-white), 0 0 0 5px var(--action-red)" : "none",
    overflow: "hidden", flexShrink: 0, position: "relative",
  };
  return (
    <div style={well}>
      {variant === "photo" ? (
        <image-slot id="persona-avatar" shape="circle"
          style={{ width: "100%", height: "100%", display: "block" }}
          placeholder="Drop a photo"></image-slot>
      ) : (
        <div style={{ position: "absolute", inset: 0, paddingTop: 14 }}>
          <Silhouette variant={variant} color="var(--slate-plum)" />
        </div>
      )}
    </div>
  );
}

/* ---- Small section header: mono label + Lucide icon -------------------- */
function SectionLabel({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon name={icon} size={15} color="var(--ash-mist)" />
      <span className="mc-label">{children}</span>
    </div>
  );
}

/* ---- A labelled list (Needs / Pain Points) ----------------------------- */
function ItemList({ items, markerColor }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{
            width: 6, height: 6, marginTop: 8, flexShrink: 0,
            background: markerColor, borderRadius: 1,
          }} />
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: "0.9375rem", lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* ======================================================================== */
function PersonaCard({ data, density = "regular", showRing = true, avatar = "female" }) {
  const pad = density === "compact" ? 32 : density === "comfy" ? 48 : 40;
  const rootRef = useRef(null);

  return (
    <div ref={rootRef} style={{
      width: 760, maxWidth: "100%", background: "var(--card-white)",
      border: "1px solid var(--border-strong)", borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-ambient)", overflow: "hidden",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{ padding: pad }}>

        {/* ---- Header ---------------------------------------------------- */}
        <header style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <Avatar variant={avatar} ring={showRing} />
          <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <span style={{ width: 7, height: 7, background: "var(--action-red)", borderRadius: 1 }} />
              <span className="mc-label">User persona</span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: "var(--font-display)", fontWeight: 800,
              fontSize: "1.875rem", lineHeight: 1.05, letterSpacing: "-0.04em",
              color: "var(--text-primary)",
            }}>{data.name}</h1>
            <p style={{
              margin: "6px 0 0", fontFamily: "var(--font-sans)", fontWeight: 600,
              fontSize: "0.9375rem", color: "var(--slate-plum)",
            }}>{data.archetype}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {data.meta.map((m, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center",
                  fontFamily: "var(--font-mono)", fontSize: "0.6875rem",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-muted)", background: "var(--warm-paper)",
                  border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-full)",
                  padding: "4px 11px",
                }}>{m}</span>
              ))}
            </div>
          </div>
        </header>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-subtle)", margin: `${pad - 8}px 0 ${pad - 16}px` }} />

        {/* ---- Description ----------------------------------------------- */}
        <section>
          <SectionLabel icon="user">Description</SectionLabel>
          <p style={{
            margin: 0, fontFamily: "var(--font-sans)", fontSize: "1rem",
            lineHeight: 1.6, color: "var(--text-primary)", maxWidth: "64ch",
          }}>{data.description}</p>
        </section>

        {/* ---- Needs | Pain Points --------------------------------------- */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
          marginTop: pad - 8,
        }}>
          <section>
            <SectionLabel icon="target">Needs</SectionLabel>
            <ItemList items={data.needs} markerColor="var(--ash-mist)" />
          </section>
          <section>
            <SectionLabel icon="alert">Pain points</SectionLabel>
            <ItemList items={data.painPoints} markerColor="var(--warm-ember)" />
          </section>
        </div>

        {/* ---- Motivation (tinted block, on-brand compass) --------------- */}
        <section style={{
          marginTop: pad - 8, background: "var(--warm-paper)",
          border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)",
          padding: density === "compact" ? 20 : 24,
        }}>
          <SectionLabel icon="compass">Motivation</SectionLabel>
          <p style={{
            margin: 0, fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: "1.125rem", lineHeight: 1.45, letterSpacing: "-0.01em",
            color: "var(--text-primary)", maxWidth: "60ch",
          }}>{data.motivation}</p>
        </section>

      </div>
    </div>
  );
}

window.PersonaCard = PersonaCard;
window.PersonaIcon = Icon;
