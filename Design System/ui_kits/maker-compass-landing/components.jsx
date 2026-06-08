/* global React, lucide */
// Maker Compass — Landing kit: shared components (Button, Icon, Nav, Footer)

const { useEffect, useRef } = React;

// Lucide icon — renders the SVG by name. Re-creates after mount.
function Icon({ name, size = 16, className = "", style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size }, nameAttr: "data-lucide" });
    }
  }, [name, size]);
  return <span ref={ref} className={className} style={{ display: "inline-flex", lineHeight: 0, ...style }} />;
}

function Button({ variant = "primary", size = "default", sharp = false, children, className = "", ...props }) {
  const cls = ["mc-btn", `mc-btn--${variant}`, `mc-btn--${size}`, sharp ? "mc-btn--sharp" : "", className].join(" ");
  return <button className={cls} {...props}>{children}</button>;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

function LandingNav({ onSignIn, onGetStarted }) {
  return (
    <header className="mc-nav">
      <div className="mc-nav__inner">
        <a className="mc-lockup" href="#top">
          <img src="../../assets/maker-compass-logo.svg" alt="Maker Compass" width="34" height="34" />
          <span className="mc-lockup__word">Maker Compass</span>
        </a>
        <nav className="mc-nav__links">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="mc-nav__actions">
          <Button variant="outline" onClick={onSignIn}>Sign In</Button>
          <Button variant="primary" onClick={onGetStarted}>Get Started</Button>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  return (
    <footer className="mc-footer">
      <div className="mc-container mc-footer__inner">
        <span className="mc-label" style={{ color: "var(--text-muted)" }}>© 2026 Maker Compass. All rights reserved.</span>
        <div className="mc-footer__links">
          <a href="#">Terms</a><a href="#">Privacy</a><a href="#">Contact</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Icon, Button, LandingNav, LandingFooter, NAV_LINKS });
