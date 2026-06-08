/* global React, ReactDOM, Icon, Button, LandingNav, LandingFooter, Hero, BuildMap, Features, HowItWorks, Pricing, BottomCTA */
// Maker Compass — Landing kit: app shell (auth modal, toast, interactivity)

const { useState, useEffect } = React;

function AuthModal({ mode, prefillIdea, onClose, onSwitch, onSubmit }) {
  const isSignup = mode === "signup";
  return (
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button className="mc-modal__close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        <h2 className="mc-modal__title">{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="mc-modal__sub">
          {prefillIdea
            ? <>Save your idea and turn it into a full plan: <strong>“{prefillIdea}”</strong></>
            : isSignup ? "Start turning ideas into shippable plans." : "Sign in to pick up where you left off."}
        </p>
        <button className="mc-modal__google"><img src="../../assets/google-logo.svg" alt="" />Continue with Google</button>
        <div className="mc-modal__divider">or</div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="mc-field"><label>Email</label><input type="email" placeholder="you@example.com" required /></div>
          <div className="mc-field"><label>Password</label><input type="password" placeholder="••••••••" required /></div>
          <Button variant="primary" type="submit" style={{ width: "100%", marginTop: 6 }}>
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>
        <div className="mc-modal__foot">
          {isSignup ? "Already have an account? " : "New to Maker Compass? "}
          <a onClick={() => onSwitch(isSignup ? "signin" : "signup")}>
            {isSignup ? "Sign in" : "Create one"}
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [modal, setModal] = useState(null); // null | {mode, idea}
  const [toast, setToast] = useState(null);

  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <LandingNav
        onSignIn={() => setModal({ mode: "signin" })}
        onGetStarted={() => setModal({ mode: "signup" })}
      />
      <Hero onSubmitIdea={(idea) => setModal({ mode: "signup", idea })} />
      <BuildMap />
      <Features />
      <HowItWorks />
      <Pricing />
      <BottomCTA onGetStarted={() => setModal({ mode: "signup" })} />
      <LandingFooter />

      {modal && (
        <AuthModal
          mode={modal.mode}
          prefillIdea={modal.idea}
          onClose={() => setModal(null)}
          onSwitch={(m) => setModal({ mode: m, idea: modal.idea })}
          onSubmit={() => { setModal(null); setToast(modal.mode === "signup" ? "Account created. Welcome aboard." : "Signed in."); }}
        />
      )}
      {toast && (
        <div className="mc-toast"><Icon name="check" size={16} style={{ color: "var(--success)" }} />{toast}</div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
