/* global React, Icon, Button */
// Maker Compass — Landing kit: page sections

const { useState, useEffect, useRef } = React;

/* ---- Hero with idea-capture input -------------------------------------- */
function Hero({ onSubmitIdea }) {
  const [idea, setIdea] = useState("");
  return (
    <section className="mc-hero" id="top">
      <div className="mc-container mc-hero__inner">
        <span className="mc-pill mc-label">Lean-in workflow for builders</span>
        <h1 className="mc-hero__title">Build your startup idea this weekend, not &ldquo;someday.&rdquo;</h1>
        <form
          className="mc-idea"
          onSubmit={(e) => { e.preventDefault(); if (idea.trim()) onSubmitIdea(idea.trim()); }}
        >
          <input
            className="mc-idea__input"
            placeholder="Describe your idea in one line…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <Button variant="primary" size="lg" type="submit">
            Get Started <Icon name="arrow-right" size={16} />
          </Button>
        </form>
        <p className="mc-hero__sub">
          Turn one idea into research, MVP plan, and actionable mockups in minutes.
          No fluff. No &ldquo;where do I start?&rdquo; spiral.
        </p>
      </div>
    </section>
  );
}

/* ---- Build Map (signature scroll-triggered graphic) -------------------- */
const BUILD_NODES = [
  { x: 8,  label: "Idea", caption: "One line in" },
  { x: 33, label: "Research", caption: "Market + competitors" },
  { x: 58, label: "Plan", caption: "PRD + MVP scope" },
  { x: 83, label: "Ship", caption: "Hand to your agent" },
];

function BuildMap() {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); io.disconnect(); } },
      { threshold: 0.35 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <section className={`mc-buildmap ${active ? "is-active" : ""}`} ref={ref}>
      <span className="mc-label mc-buildmap__kicker">The Build Map</span>
      <h2 className="mc-buildmap__title">One intake becomes every core artifact.</h2>
      <div className="mc-buildmap__stage">
        <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="mc-buildmap__svg">
          <line x1="6" y1="11" x2="94" y2="11" className="mc-bm-base" />
          <line x1="6" y1="11" x2="94" y2="11" className="mc-bm-progress" />
        </svg>
        <div className="mc-buildmap__nodes">
          {BUILD_NODES.map((n, i) => (
            <div
              key={n.label}
              className="mc-bm-card"
              style={{ left: `${n.x}%`, "--bm-delay": `${0.5 + i * 0.55}s` }}
            >
              <span className="mc-bm-dot" />
              <div className="mc-bm-cardbody">
                <span className="mc-label" style={{ color: "var(--action-red)" }}>{`0${i + 1}`}</span>
                <div className="mc-bm-cardtitle">{n.label}</div>
                <div className="mc-bm-cardcap">{n.caption}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Features ----------------------------------------------------------- */
const OUTPUTS = [
  {
    eyebrow: "Research",
    title: "Know the market before you commit a sprint.",
    description: "Maker Compass maps competitors, pricing, positioning, gaps, and first wedges so your idea starts with context instead of guesswork.",
    artifacts: ["Competitive scan", "Audience segments", "Differentiation wedges"],
  },
  {
    eyebrow: "Product",
    title: "Turn the idea into a buildable plan.",
    description: "Generate the product plan, first-version scope, acceptance criteria, mockup directions, and technical blueprint your coding agent needs to start cleanly.",
    artifacts: ["Product plan", "First version plan", "Design mockups", "Technical spec"],
  },
];
const SIGNALS = [
  "One intake becomes every core artifact.",
  "Docs stay tied to the same project context.",
  "Output is written for builders, not slide decks.",
];

function Features() {
  return (
    <section className="mc-section" id="features">
      <span className="mc-label">Features</span>
      <h2 className="mc-section__title">From idea to momentum, without the usual excuses</h2>
      <div className="mc-features">
        {OUTPUTS.map((o) => (
          <article key={o.eyebrow} className="mc-feature">
            <span className="mc-label" style={{ color: "var(--text-muted)" }}>{o.eyebrow}</span>
            <h3 className="mc-feature__title">{o.title}</h3>
            <p className="mc-feature__desc">{o.description}</p>
            <div className="mc-feature__tags">
              {o.artifacts.map((a) => <span key={a} className="mc-tag">{a}</span>)}
            </div>
          </article>
        ))}
      </div>
      <div className="mc-signals">
        {SIGNALS.map((s) => <div key={s} className="mc-signal">{s}</div>)}
      </div>
    </section>
  );
}

/* ---- How it works ------------------------------------------------------- */
const STEPS = [
  { n: "01", title: "Describe what you want to build", body: "Share your idea, target users, and constraints in plain language." },
  { n: "02", title: "Generate research + product direction", body: "Get focused analysis, key assumptions, and where your idea can stand out." },
  { n: "03", title: "Create your first-version plan + mockups", body: "Produce actionable docs and compare design directions before implementation." },
  { n: "04", title: "Build and iterate", body: "Ship faster with a clear plan, then refine with feedback as you learn from users." },
];

function HowItWorks() {
  return (
    <section className="mc-section" id="how-it-works">
      <span className="mc-label">How It Works</span>
      <h2 className="mc-section__title">Your first version, broken into clear steps</h2>
      <div className="mc-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="mc-step">
            <span className="mc-step__num">{s.n}</span>
            <div>
              <div className="mc-step__title">{s.title}</div>
              <p className="mc-step__body">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- Pricing ------------------------------------------------------------ */
const PLANS = [
  { name: "Free", price: "$0/mo", points: ["40 tokens included", "~1 full report (fast model)", "Community support"], cta: "Choose Free", dark: false },
  { name: "Starter", price: "$29/mo", points: ["250 tokens monthly", "~5 full reports (balanced)", "Product plan + tech spec export"], cta: "Start Starter", dark: false },
  { name: "Pro", price: "$79/mo", points: ["900 tokens monthly", "~16 full reports (thinking)", "App generation + priority support"], cta: "Go Pro", dark: true },
  { name: "Enterprise", price: "Custom", points: ["Custom token pools", "Dedicated VPC", "SSO + RBAC", "Custom integrations"], cta: "Talk to Sales", dark: false },
];

function Pricing() {
  return (
    <section className="mc-section" id="pricing">
      <span className="mc-label">Pricing</span>
      <h2 className="mc-section__title">Plans For Builders At Every Stage</h2>
      <p className="mc-section__lead">1 token = $0.20. Full report estimate: fast 28 tokens, balanced 42 tokens, thinking 53 tokens.</p>
      <div className="mc-plans">
        {PLANS.map((p) => (
          <article key={p.name} className={`mc-plan ${p.dark ? "mc-plan--dark" : ""}`}>
            <div className="mc-plan__head">
              <h3 className="mc-plan__name">{p.name}</h3>
              {p.dark && <span className="mc-plan__badge">Best Value</span>}
            </div>
            <p className="mc-plan__price">{p.price}</p>
            <div className="mc-plan__points">
              {p.points.map((pt) => <p key={pt}>{pt}</p>)}
            </div>
            <Button variant={p.dark ? "primary" : "outline"} className="mc-plan__cta">{p.cta}</Button>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---- Bottom CTA --------------------------------------------------------- */
function BottomCTA({ onGetStarted }) {
  return (
    <section className="mc-cta">
      <div className="mc-container" style={{ textAlign: "center" }}>
        <h2 className="mc-cta__title">Stop waiting. Start building.</h2>
        <p className="mc-cta__sub">Get early access and turn your next idea into research, plans, and mockups you can actually execute.</p>
        <Button variant="primary" sharp size="lg" onClick={onGetStarted} style={{ marginTop: 28 }}>
          Get Started <Icon name="arrow-right" size={16} />
        </Button>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, BuildMap, Features, HowItWorks, Pricing, BottomCTA });
