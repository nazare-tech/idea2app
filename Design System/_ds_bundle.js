/* @ds-bundle: {"format":3,"namespace":"MakerCompassDesignSystem_73e979","components":[],"sourceHashes":{"PersonaCard.jsx":"7475b284864d","image-slot.js":"cf5f1791dd04","product-plan-data.js":"10da326616b5","product-plan.js":"d3e9f843986e","tweaks-panel.jsx":"7f64c6909a8b","ui_kits/maker-compass-app/app.jsx":"ecb2c19b3b71","ui_kits/maker-compass-app/shell.jsx":"2186c3c1e70f","ui_kits/maker-compass-app/views.jsx":"2edec78642ee","ui_kits/maker-compass-landing/app.jsx":"7b60b2d039ad","ui_kits/maker-compass-landing/components.jsx":"2f4fbf2435c1","ui_kits/maker-compass-landing/sections.jsx":"f72d149c6977"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MakerCompassDesignSystem_73e979 = window.MakerCompassDesignSystem_73e979 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// PersonaCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* PersonaCard.jsx — Maker Compass user-persona card template.
   "The Builder's Workshop": tinted neutrals, one decisive Action-Red accent,
   Hanken Grotesk + Fira Mono, flat surfaces, hairline borders, gently rounded
   product register. Silhouettes are simple shapes; section icons are faithful
   Lucide paths. Exports PersonaCard to window. */

const {
  useEffect,
  useRef
} = React;

/* ---- Faithful Lucide icon paths (stroke, 1.75) ------------------------- */
const ICON_PATHS = {
  user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 21a8 8 0 0 0-16 0"
  })),
  target: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2"
  })),
  alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  })),
  compass: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }))
};
function Icon({
  name,
  size = 16,
  color = "currentColor",
  stroke = 1.75,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      ...style
    }
  }, ICON_PATHS[name]);
}

/* ---- Silhouettes — built from simple shapes (circle + rounded bust) ---- */
function Silhouette({
  variant,
  color
}) {
  const common = {
    fill: color
  };
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    width: "100%",
    height: "100%",
    "aria-hidden": "true",
    style: {
      display: "block"
    }
  }, variant === "female" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", _extends({
    x: "28",
    y: "18",
    width: "44",
    height: "58",
    rx: "22"
  }, common)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M17 100 C17 77 32 68 50 68 C68 68 83 77 83 100 Z"
  }, common))) : variant === "male" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M14 100 C14 73 31 64 50 64 C69 64 86 73 86 100 Z"
  }, common)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "50",
    cy: "35",
    r: "20"
  }, common))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M17 100 C17 75 32 66 50 66 C68 66 83 75 83 100 Z"
  }, common)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "50",
    cy: "37",
    r: "18"
  }, common))));
}

/* ---- Avatar: circular, warm-paper well, thin red brand ring ------------ */
function Avatar({
  variant,
  ring
}) {
  const size = 104;
  const well = {
    width: size,
    height: size,
    borderRadius: "var(--radius-full)",
    background: "var(--warm-paper)",
    border: "1px solid var(--border-strong)",
    boxShadow: ring ? "0 0 0 3px var(--card-white), 0 0 0 5px var(--action-red)" : "none",
    overflow: "hidden",
    flexShrink: 0,
    position: "relative"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: well
  }, variant === "photo" ? /*#__PURE__*/React.createElement("image-slot", {
    id: "persona-avatar",
    shape: "circle",
    style: {
      width: "100%",
      height: "100%",
      display: "block"
    },
    placeholder: "Drop a photo"
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement(Silhouette, {
    variant: variant,
    color: "var(--slate-plum)"
  })));
}

/* ---- Small section header: mono label + Lucide icon -------------------- */
function SectionLabel({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15,
    color: "var(--ash-mist)"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, children));
}

/* ---- A labelled list (Needs / Pain Points) ----------------------------- */
function ItemList({
  items,
  markerColor
}) {
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 11
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: "flex",
      gap: 11,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      marginTop: 8,
      flexShrink: 0,
      background: markerColor,
      borderRadius: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "0.9375rem",
      lineHeight: 1.5,
      color: "var(--text-secondary)"
    }
  }, it))));
}

/* ======================================================================== */
function PersonaCard({
  data,
  density = "regular",
  showRing = true,
  avatar = "female"
}) {
  const pad = density === "compact" ? 32 : density === "comfy" ? 48 : 40;
  const rootRef = useRef(null);
  return /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    style: {
      width: 760,
      maxWidth: "100%",
      background: "var(--card-white)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-ambient)",
      overflow: "hidden",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      gap: 24,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    variant: avatar,
    ring: showRing
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      background: "var(--action-red)",
      borderRadius: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "User persona")), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: "1.875rem",
      lineHeight: 1.05,
      letterSpacing: "-0.04em",
      color: "var(--text-primary)"
    }
  }, data.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: "0.9375rem",
      color: "var(--slate-plum)"
    }
  }, data.archetype), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16
    }
  }, data.meta.map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: "0.6875rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      background: "var(--warm-paper)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-full)",
      padding: "4px 11px"
    }
  }, m))))), /*#__PURE__*/React.createElement("hr", {
    style: {
      border: 0,
      borderTop: "1px solid var(--border-subtle)",
      margin: `${pad - 8}px 0 ${pad - 16}px`
    }
  }), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "user"
  }, "Description"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontSize: "1rem",
      lineHeight: 1.6,
      color: "var(--text-primary)",
      maxWidth: "64ch"
    }
  }, data.description)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 32,
      marginTop: pad - 8
    }
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "target"
  }, "Needs"), /*#__PURE__*/React.createElement(ItemList, {
    items: data.needs,
    markerColor: "var(--ash-mist)"
  })), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "alert"
  }, "Pain points"), /*#__PURE__*/React.createElement(ItemList, {
    items: data.painPoints,
    markerColor: "var(--warm-ember)"
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      marginTop: pad - 8,
      background: "var(--warm-paper)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: density === "compact" ? 20 : 24
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "compass"
  }, "Motivation"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.45,
      letterSpacing: "-0.01em",
      color: "var(--text-primary)",
      maxWidth: "60ch"
    }
  }, data.motivation))));
}
window.PersonaCard = PersonaCard;
window.PersonaIcon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "PersonaCard.jsx", error: String((e && e.message) || e) }); }

// image-slot.js
try { (() => {
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "image-slot.js", error: String((e && e.message) || e) }); }

// product-plan-data.js
try { (() => {
/* Product Plan — content data (extracted from the source PRD) */
window.PP_STORIES = [{
  id: "US-001",
  title: "Install and activate the extension",
  role: "fashion influencer",
  want: "install the Wear It Now AI Mirror browser extension and activate it on a clothing website",
  so: "I can see myself wearing the products on that site",
  ac: ["Available on the Chrome Web Store and installs without errors on Chrome 110+.", "After installation, the extension icon appears in the Chrome toolbar.", "Clicking the icon on any page opens a popup with a \u201cTry On Mirror\u201d toggle.", "If not logged in, the toggle is disabled and a \u201cSign In\u201d link is visible.", "If logged in with an avatar and credits, the toggle is enabled."]
}, {
  id: "US-002",
  title: "Register and create an account",
  role: "new visitor",
  want: "create an account using my email or Google",
  so: "I can access the try-on features",
  ac: ["Registration accepts email and password or Google OAuth.", "Invalid email format shows: \u201cPlease enter a valid email address.\u201d", "Password under 8 chars or missing a number/letter shows the requirement.", "Duplicate email shows: \u201cAn account with this email already exists. Sign in instead.\u201d", "Successful registration sends a verification email.", "User is redirected to the onboarding avatar upload flow.", "User cannot generate try-on images until their email is verified."]
}, {
  id: "US-003",
  title: "Upload an avatar photo",
  role: "registered user",
  want: "upload a photo of myself as my avatar",
  so: "the AI can generate try-on images showing me in the clothes",
  ac: ["Accepts JPEG, PNG, and WEBP files up to 10 MB.", "Files over 10 MB show: \u201cFile size exceeds 10 MB. Please upload a smaller image.\u201d", "Unsupported formats show a specific error message.", "No detectable face shows: \u201cWe couldn\u2019t detect a clear face in your photo\u2026\u201d", "Processed photo shows a preview with \u201cConfirm\u201d and \u201cTry a different photo.\u201d", "Confirming saves the avatar and advances onboarding.", "User can replace their avatar anytime from settings with the same rules."]
}, {
  id: "US-004",
  title: "Receive free trial credits",
  role: "newly registered user who completed onboarding",
  want: "receive free trial credits automatically",
  so: "I can try the product before purchasing",
  ac: ["Exactly 5 credits added after email verification and avatar upload.", "Dashboard balance reflects 5 credits immediately after onboarding.", "Success toast: \u201c5 free credits added to your account. Start trying on clothes!\u201d", "Trial credits granted once per account; re-uploading does not add more."]
}, {
  id: "US-005",
  title: "Generate try-on images on a clothing site",
  role: "fashion influencer with credits",
  want: "activate the mirror on a clothing website and see myself wearing the products",
  so: "I can evaluate styles and create content without buying items",
  ac: ["Activating on a page with product images shows a credit confirmation banner with count and total cost.", "Banner includes \u201cGenerate Try-Ons \u2013 Use X Credits\u201d and \u201cCancel.\u201d", "Cancel dismisses the banner, consumes no credits, and leaves the page unchanged.", "Generate deducts credits immediately and begins generation.", "Each image shows a shimmer placeholder while generating, then the result.", "Popup balance updates to reflect deducted credits.", "A single failure restores the original image, shows a retry icon, and charges no credit.", "Full service outage shows an error banner; no images replaced, no credits consumed."]
}, {
  id: "US-006",
  title: "Browse across pages with the mirror active",
  role: "fashion influencer",
  want: "the mirror to keep working as I navigate between pages on a clothing site",
  so: "I can browse naturally without re-activating it every page",
  ac: ["Toggle state persists across pages within the same domain and session.", "Each new page with product images shows a new credit confirmation before generating.", "Returning to an already-generated page serves cached images with no charge.", "Navigating away mid-generation cancels remaining work and charges nothing for them."]
}, {
  id: "US-007",
  title: "Download a generated try-on image",
  role: "fashion influencer",
  want: "download a generated try-on image",
  so: "I can use it in my content or share it with my audience",
  ac: ["Hovering a successful image reveals a download icon overlay.", "Clicking saves the image locally in JPEG format.", "File is named wearit-[timestamp].jpg.", "The download consumes no additional credit.", "No download icon on shimmer placeholders or failed slots."]
}, {
  id: "US-008",
  title: "Purchase credits",
  role: "registered user who ran out of credits",
  want: "purchase a credit bundle",
  so: "I can continue generating try-on images",
  ac: ["Purchase page shows at least three bundles with price, credits, and per-credit cost.", "Selecting a bundle redirects to a Stripe-hosted checkout page.", "Successful payment adds credits to the balance immediately.", "Success toast on the dashboard: \u201cX credits added to your account.\u201d", "Failed or cancelled payment returns to the credits page with no change.", "Transaction appears in history with correct date, amount, and quantity."]
}, {
  id: "US-009",
  title: "View generation history",
  role: "registered user",
  want: "view a history of my try-on sessions",
  so: "I can track credit usage and revisit sites I\u2019ve used",
  ac: ["Lists all past sessions in reverse chronological order.", "Each entry shows date, website domain, image count, and credits consumed.", "Empty state: \u201cNo try-on sessions yet. Install the extension and start browsing.\u201d", "History is paginated at 20 entries per page."]
}, {
  id: "US-010",
  title: "Report an incompatible site",
  role: "registered user",
  want: "report a clothing site where the extension couldn\u2019t detect product images",
  so: "the team can investigate and add support",
  ac: ["No detected images shows a \u201cReport this site\u201d button in the popup.", "Clicking submits the page URL and account ID to the compatibility queue.", "Confirmation: \u201cThanks! We\u2019ve logged this site for review.\u201d", "Same URL can\u2019t be submitted more than once per user per day.", "Report appears in the admin panel with URL, date, and status \u201cNew.\u201d"]
}, {
  id: "US-011",
  title: "Admin manages user credits",
  role: "admin",
  want: "manually adjust a user\u2019s credit balance",
  so: "I can resolve billing issues or grant goodwill credits",
  ac: ["Admin panel shows a searchable list of users by email.", "Selecting a user shows current balance and full transaction history.", "Admin can add/deduct an integer with a required reason field.", "Submitting updates the balance and logs the admin ID and reason.", "No reason shows: \u201cPlease provide a reason for this adjustment.\u201d", "Deductions below zero are blocked: \u201cCannot reduce balance below zero.\u201d"]
}];
window.PP_REQ_GROUPS = [{
  name: "Browser extension",
  icon: "puzzle",
  items: ["Installable from the Chrome Web Store, compatible with Chrome 110+.", "Injects a toolbar popup with a \u201cTry On Mirror\u201d toggle on any page.", "When toggled on, scans the page DOM for clothing <code>&lt;img&gt;</code> elements and returns a count.", "Shows a credit confirmation banner with image count and total credits before generating.", "Does not begin generating until the user explicitly confirms.", "Sends each product image URL and the avatar reference to the AI API on confirmation.", "Replaces each original image with a shimmer placeholder while loading.", "Replaces each shimmer with the generated try-on image on success.", "On a single failure, restores the original image, shows a retry icon, charges no credit.", "Shows an error banner if the AI service is fully unavailable; consumes no credits.", "Caches generated images for the session so revisits don\u2019t re-charge.", "Restores all originals instantly when the toggle is turned off (no reload).", "Shows a hover download overlay on each successful image.", "Download saves locally as JPEG at the original display dimensions.", "Shows a \u201cReport this site\u201d button when no images are detected.", "Cancels in-progress requests and charges nothing if the user navigates away.", "Requires login before the toggle can be activated.", "If logged out, shows a \u201cSign In\u201d link opening the dashboard in a new tab.", "Maintains the session with a stored token; no re-login unless it expires.", "Displays the current credit balance in the popup at all times when logged in."]
}, {
  name: "Accounts & onboarding",
  icon: "user-round",
  items: ["Register with email and password.", "Register or log in with Google OAuth.", "Passwords \u2265 8 chars with at least one number and one letter.", "Send a verification email; require verification before generating.", "Guided onboarding after first registration prompts avatar upload first.", "Allow one avatar photo per account.", "Accept JPEG, PNG, or WEBP avatars up to 10 MB.", "Automated quality check rejects photos with no detectable face, with a specific reason.", "Show a preview of the processed avatar for confirmation before saving.", "Allow replacing the avatar anytime; prior images are not altered."]
}, {
  name: "Credits & payments",
  icon: "credit-card",
  items: ["Display the current balance prominently on the dashboard and in the popup.", "Offer at least three credit bundles at checkout (assumed 20 / 60 / 150 with increasing discounts).", "Process purchases via Stripe; add credits to the balance immediately on success.", "Show full transaction history: date, amount paid, credits received.", "Show generation history: date, website, image count, credits consumed.", "Grant 5 free trial credits on completing avatar upload and email verification."]
}, {
  name: "Admin",
  icon: "shield-check",
  items: ["Paginated list of all users with email, registration date, balance, and total consumed.", "Manually add or deduct credits from any account with a required reason.", "View all site compatibility reports with reported URL and submission date.", "Mark reports as \u201cUnder Review,\u201d \u201cResolved,\u201d or \u201cWon\u2019t Fix.\u201d"]
}, {
  name: "Analytics events",
  icon: "bar-chart-3",
  span: true,
  items: ["Extension installed.", "Avatar upload completed.", "Mirror activated on a page (includes the site domain).", "Credit generation confirmed (includes image count and credits consumed).", "Generated image downloaded.", "Credit purchase initiated and successfully completed."]
}];
window.PP_SCOPE = [{
  t: "Mobile",
  h: "Mobile browser or native app support",
  d: "The extension model requires a desktop browser. Deferred until the core experience is validated."
}, {
  t: "Browsers",
  h: "Firefox, Safari, or Edge support",
  d: "MVP targets Chrome only to reduce QA and compatibility overhead."
}, {
  t: "Categories",
  h: "Non-clothing categories",
  d: "Shoes, accessories, bags, and jewelry require separate model training. Deferred."
}, {
  t: "Media",
  h: "Video or animated try-on",
  d: "Real-time video overlay needs far more compute and latency management. Deferred."
}, {
  t: "Avatars",
  h: "Multiple avatar profiles per account",
  d: "Adds complexity to the credit model and UX. Deferred."
}, {
  t: "Organize",
  h: "Outfit saving, wishlists, or lookbooks",
  d: "Valuable, but not required to validate the core try-on experience."
}, {
  t: "Social",
  h: "Social sharing, community, or follower system",
  d: "A growth layer, not an MVP requirement."
}, {
  t: "AI",
  h: "AI styling recommendations",
  d: "Suggesting what to wear is a separate capability deferred post-MVP."
}, {
  t: "B2B",
  h: "B2B retailer integration or white-label",
  d: "The MVP is entirely consumer-facing. B2B is a future revenue stream."
}, {
  t: "Pricing",
  h: "Subscription pricing model",
  d: "MVP uses pay-per-use credits only. Subscriptions may follow once usage is understood."
}, {
  t: "Affiliate",
  h: "Affiliate link tracking or monetization tools",
  d: "Influencer-specific affiliate features are deferred to a later phase."
}, {
  t: "Offline",
  h: "Offline mode",
  d: "The extension requires an active connection to call the AI generation API."
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "product-plan-data.js", error: String((e && e.message) || e) }); }

// product-plan.js
try { (() => {
/* Product Plan — render + interactions */
(function () {
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---- User stories ---- */
  const sg = document.getElementById("storyGrid");
  (window.PP_STORIES || []).forEach(function (s) {
    const card = el("article", "pp-story");
    const top = el("div", "pp-story-top");
    top.appendChild(el("span", "sid", s.id));
    top.appendChild(el("h3", "stitle", s.title));
    top.appendChild(el("p", "sstory", "As a <b>" + s.role + "</b>, I want to " + s.want + ", so that " + s.so + "."));
    card.appendChild(top);
    const det = el("details", "pp-ac");
    const sum = el("summary", null, "Acceptance criteria (" + s.ac.length + ")<span data-lucide=\"chevron-down\" class=\"chev\"></span>");
    det.appendChild(sum);
    const ul = el("ul", "pp-ac-list");
    s.ac.forEach(function (a) {
      ul.appendChild(el("li", null, "<span data-lucide=\"check\"></span><span>" + a + "</span>"));
    });
    det.appendChild(ul);
    card.appendChild(det);
    sg.appendChild(card);
  });

  /* ---- Functional requirements ---- */
  const rg = document.getElementById("reqGrid");
  (window.PP_REQ_GROUPS || []).forEach(function (g) {
    const card = el("div", "pp-req" + (g.span ? " span" : ""));
    const head = el("div", "pp-req-head");
    head.appendChild(el("div", "ic", "<span data-lucide=\"" + g.icon + "\"></span>"));
    head.appendChild(el("div", "gname", g.name));
    head.appendChild(el("div", "gcount", g.items.length + " reqs"));
    card.appendChild(head);
    const ul = el("ul", "pp-req-list");
    g.items.forEach(function (it) {
      ul.appendChild(el("li", null, "<span>" + it + "</span>"));
    });
    card.appendChild(ul);
    rg.appendChild(card);
  });

  /* ---- Out of scope ---- */
  const cg = document.getElementById("scopeGrid");
  (window.PP_SCOPE || []).forEach(function (n) {
    const item = el("div", "pp-ng");
    item.appendChild(el("span", "ngt", n.t));
    const c = el("div", "ngc");
    c.appendChild(el("div", "h", n.h));
    c.appendChild(el("div", "d", n.d));
    item.appendChild(c);
    cg.appendChild(item);
  });

  /* ---- Lucide icons ---- */
  if (window.lucide) lucide.createIcons();

  /* ---- Scroll-spy nav ---- */
  const links = Array.prototype.slice.call(document.querySelectorAll(".pp-toc a"));
  const map = {};
  links.forEach(function (a) {
    map[a.getAttribute("href").slice(1)] = a;
  });
  const sections = links.map(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });
  const spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        links.forEach(function (l) {
          l.classList.remove("active");
        });
        const a = map[en.target.id];
        if (a) a.classList.add("active");
      }
    });
  }, {
    rootMargin: "-20% 0px -70% 0px",
    threshold: 0
  });
  sections.forEach(function (s) {
    if (s) spy.observe(s);
  });

  /* ---- Build Map timeline reveal ---- */
  const delivery = document.getElementById("delivery");
  const progress = document.getElementById("bmProgress");
  const phases = Array.prototype.slice.call(document.querySelectorAll("[data-phase]"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    if (progress) progress.style.width = "67%";
    phases.forEach(function (p) {
      p.classList.add("in");
    });
  } else if (delivery) {
    const tObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (progress) progress.style.width = "67%"; /* weeks 1-8 of 12 */
          phases.forEach(function (p, i) {
            setTimeout(function () {
              p.classList.add("in");
            }, 120 + i * 140);
          });
          tObs.disconnect();
        }
      });
    }, {
      threshold: 0.25
    });
    tObs.observe(delivery);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "product-plan.js", error: String((e && e.message) || e) }); }

// tweaks-panel.jsx
try { (() => {
/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-app/app.jsx
try { (() => {
/* global React, ReactDOM, Sidebar, ProjectsView, IntakeView, WorkspaceView */
// Maker Compass — App kit: shell + view routing

const {
  useState,
  useEffect
} = React;
const SEED = [{
  id: 1,
  name: "Apex Revenue OS",
  description: "A CRM that surfaces qualified pipeline automatically and nudges reps toward the next best action.",
  created: "3 days ago"
}, {
  id: 2,
  name: "StayFlow Booking",
  description: "Instant-host onboarding for short-stay marketplaces. Cut setup time from days to minutes.",
  created: "1 week ago"
}, {
  id: 3,
  name: "Northstar Budget Suite",
  description: "Personal finance planner with retention alerts and a weekly money review built for builders.",
  created: "2 weeks ago"
}];
function App() {
  const [nav, setNav] = useState("Projects"); // sidebar section
  const [view, setView] = useState("projects"); // projects | intake | workspace
  const [projects, setProjects] = useState(SEED);
  const [current, setCurrent] = useState(null);
  let nextId = useState(() => ({
    v: 100
  }))[0];
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const openProject = p => {
    setCurrent(p);
    setView("workspace");
  };
  const deleteProject = id => setProjects(ps => ps.filter(p => p.id !== id));
  const generate = ({
    name,
    description
  }) => {
    const p = {
      id: nextId.v++,
      name,
      description,
      created: "just now"
    };
    setProjects(ps => [p, ...ps]);
    setCurrent(p);
    setView("workspace");
  };
  const handleNav = section => {
    setNav(section);
    if (section === "Projects" || section === "Dashboard") setView("projects");
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-shell"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: nav,
    onNavigate: handleNav
  }), /*#__PURE__*/React.createElement("main", {
    className: "ac-main"
  }, view === "projects" && /*#__PURE__*/React.createElement(ProjectsView, {
    projects: projects,
    onOpen: openProject,
    onNew: () => setView("intake"),
    onDelete: deleteProject
  }), view === "intake" && /*#__PURE__*/React.createElement(IntakeView, {
    onCancel: () => setView("projects"),
    onGenerate: generate
  }), view === "workspace" && current && /*#__PURE__*/React.createElement(WorkspaceView, {
    project: current,
    onBack: () => setView("projects")
  })));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-app/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-app/shell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
// Maker Compass — App kit: shell primitives (Icon, Button, Input, Sidebar, TopBar)

const {
  useEffect,
  useRef
} = React;
function Icon({
  name,
  size = 18,
  className = "",
  style = {}
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size
        }
      });
    }
  }, [name, size]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: className,
    style: {
      display: "inline-flex",
      lineHeight: 0,
      ...style
    }
  });
}
function Button({
  variant = "primary",
  size = "default",
  children,
  className = "",
  ...props
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: ["ac-btn", `ac-btn--${variant}`, `ac-btn--${size}`, className].join(" ")
  }, props), children);
}
const NAV = [{
  name: "Dashboard",
  icon: "layout-dashboard"
}, {
  name: "Projects",
  icon: "folder-kanban"
}, {
  name: "Billing",
  icon: "credit-card"
}, {
  name: "Preferences",
  icon: "settings"
}];
function Sidebar({
  active,
  onNavigate,
  credits = 132
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "ac-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-sidebar__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/maker-compass-logo.svg",
    alt: "",
    width: "26",
    height: "26"
  }), /*#__PURE__*/React.createElement("span", null, "Maker Compass")), /*#__PURE__*/React.createElement("nav", {
    className: "ac-sidebar__nav"
  }, NAV.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.name,
    className: `ac-navitem ${active === item.name ? "is-active" : ""}`,
    onClick: () => onNavigate(item.name)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 18
  }), item.name))), /*#__PURE__*/React.createElement("div", {
    className: "ac-sidebar__credits"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-credits"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-credits__label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "coins",
    size: 14,
    style: {
      color: "var(--warm-coral)"
    }
  }), "Credits"), /*#__PURE__*/React.createElement("div", {
    className: "ac-credits__num"
  }, credits))), /*#__PURE__*/React.createElement("div", {
    className: "ac-sidebar__signout"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ac-navitem ac-navitem--signout"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 18
  }), "Sign out")));
}
Object.assign(window, {
  Icon,
  Button,
  Sidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-app/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-app/views.jsx
try { (() => {
/* global React, Icon, Button */
// Maker Compass — App kit: views (Projects, Intake, Workspace)

const {
  useState,
  useRef,
  useEffect
} = React;

/* ===== Projects ========================================================= */
function ProjectCard({
  project,
  onOpen,
  onDelete
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-pcard-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ac-pcard",
    onClick: () => onOpen(project)
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "ac-pcard__name"
  }, project.name), /*#__PURE__*/React.createElement("p", {
    className: "ac-pcard__desc"
  }, project.description)), /*#__PURE__*/React.createElement("div", {
    className: "ac-pcard__meta"
  }, "Created ", project.created)), /*#__PURE__*/React.createElement("button", {
    className: "ac-pcard__del",
    "aria-label": "Delete",
    onClick: e => {
      e.stopPropagation();
      onDelete(project.id);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  })));
}
function ProjectsView({
  projects,
  onOpen,
  onNew,
  onDelete
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-pagehead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "Workspace"), /*#__PURE__*/React.createElement("h1", {
    className: "ac-pagehead__title"
  }, "Projects"), /*#__PURE__*/React.createElement("p", {
    className: "ac-pagehead__desc"
  }, "Manage the ideas, plans, and generated artifacts you are actively shaping.")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onNew
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "New Project")), projects.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "ac-empty"
  }, /*#__PURE__*/React.createElement("p", {
    className: "ac-empty__title"
  }, "No projects yet."), /*#__PURE__*/React.createElement("p", {
    className: "ac-empty__sub"
  }, "Create your first idea to get started."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onNew,
    style: {
      marginTop: 16
    }
  }, "New Project")) : /*#__PURE__*/React.createElement("div", {
    className: "ac-grid"
  }, projects.map(p => /*#__PURE__*/React.createElement(ProjectCard, {
    key: p.id,
    project: p,
    onOpen: onOpen,
    onDelete: onDelete
  }))));
}

/* ===== Idea intake ====================================================== */
function IntakeView({
  onCancel,
  onGenerate
}) {
  const [idea, setIdea] = useState("");
  const [users, setUsers] = useState("");
  const [constraints, setConstraints] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = e => {
    e.preventDefault();
    if (!idea.trim() || busy) return;
    setBusy(true);
    const name = idea.trim().split(/[.,\n]/)[0].slice(0, 42);
    setTimeout(() => onGenerate({
      name: name || "Untitled idea",
      description: idea.trim()
    }), 1400);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-page ac-intake"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ac-back",
    onClick: onCancel
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), "Projects"), /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "New project"), /*#__PURE__*/React.createElement("h1", {
    className: "ac-pagehead__title"
  }, "Describe what you want to build"), /*#__PURE__*/React.createElement("p", {
    className: "ac-pagehead__desc"
  }, "Share your idea, target users, and constraints in plain language. Maker Compass turns it into research, a plan, and mockups."), /*#__PURE__*/React.createElement("form", {
    className: "ac-form",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-field"
  }, /*#__PURE__*/React.createElement("label", null, "Your idea"), /*#__PURE__*/React.createElement("textarea", {
    className: "ac-textarea",
    rows: 4,
    placeholder: "A weekend tool that turns a one-line idea into a buildable plan for indie hackers\u2026",
    value: idea,
    onChange: e => setIdea(e.target.value),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "ac-field-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-field"
  }, /*#__PURE__*/React.createElement("label", null, "Target users"), /*#__PURE__*/React.createElement("input", {
    className: "ac-input",
    placeholder: "Indie founders, solo builders",
    value: users,
    onChange: e => setUsers(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "ac-field"
  }, /*#__PURE__*/React.createElement("label", null, "Constraints (optional)"), /*#__PURE__*/React.createElement("input", {
    className: "ac-input",
    placeholder: "Ship in a weekend, no budget",
    value: constraints,
    onChange: e => setConstraints(e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ac-form__actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    type: "button",
    onClick: onCancel
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "loader",
    size: 16,
    className: "ac-spin"
  }), "Generating\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, "Generate plan ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 16
  }))))));
}

/* ===== Workspace ======================================================== */
const TABS = ["Competitive", "PRD", "MVP Plan", "Tech Spec"];
const ARTIFACTS = {
  Competitive: {
    kicker: "Competitive Analysis",
    title: "Where this idea wins",
    blocks: [{
      h: "Market snapshot",
      p: "Three incumbents own the structured-planning space, but all of them optimize for teams, not solo builders. The wedge is speed and single-session output: a builder lands with a vague idea and leaves with artifacts a coding agent can act on."
    }, {
      table: {
        head: ["Competitor", "Angle", "Gap"],
        rows: [["Notion AI", "General workspace", "No build-ready output"], ["Linear", "Issue tracking", "Starts after the plan exists"], ["v0 / Lovable", "UI generation", "Skips research + scope"]]
      }
    }, {
      h: "First wedge",
      p: "Lead with the research-to-spec pipeline. Win the moment between \"I have an idea\" and \"I have something to build,\" which none of the incumbents address directly."
    }]
  },
  PRD: {
    kicker: "Product Requirements",
    title: "First-version scope",
    blocks: [{
      h: "Problem",
      p: "Builders lose weeks to analysis paralysis and tool-switching before any code is written. The gap between idea and buildable spec is unstructured and lonely."
    }, {
      h: "Goals",
      list: ["One intake produces every core artifact", "Output is written for builders, not slide decks", "Docs stay tied to a single project context"]
    }, {
      h: "First version",
      p: "Intake → competitive scan → PRD → MVP plan → mockups → tech spec. Each artifact streams in and is editable inline. No real-time collaboration in v1."
    }]
  },
  "MVP Plan": {
    kicker: "MVP Plan",
    title: "Build it this weekend",
    blocks: [{
      h: "Milestones",
      list: ["Intake form + project creation", "Streaming artifact generation", "Inline editing + export", "Handoff bundle for coding agents"]
    }, {
      h: "Acceptance criteria",
      p: "A user with a one-line idea can finish the prep work in a single session and walk out with a PRD, an MVP plan, and mockups ready to hand to Cursor or Claude Code."
    }]
  },
  "Tech Spec": {
    kicker: "Technical Blueprint",
    title: "Architecture at a glance",
    blocks: [{
      h: "Stack",
      p: "Next.js App Router on the edge, Supabase for auth + data, an LLM gateway for model routing, and streaming NDJSON for artifact generation."
    }, {
      h: "Data model",
      list: ["projects — one per idea", "analyses — typed artifacts per project", "messages — assistant chat, scoped to project"]
    }]
  }
};
function Artifact({
  tab
}) {
  const a = ARTIFACTS[tab];
  return /*#__PURE__*/React.createElement("article", {
    className: "ac-doc"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label",
    style: {
      color: "var(--text-muted)"
    }
  }, a.kicker), /*#__PURE__*/React.createElement("h2", {
    className: "ac-doc__title"
  }, a.title), a.blocks.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ac-doc__block"
  }, b.h && /*#__PURE__*/React.createElement("h3", {
    className: "ac-doc__h"
  }, b.h), b.p && /*#__PURE__*/React.createElement("p", {
    className: "ac-doc__p"
  }, b.p), b.list && /*#__PURE__*/React.createElement("ul", {
    className: "ac-doc__list"
  }, b.list.map(li => /*#__PURE__*/React.createElement("li", {
    key: li
  }, li))), b.table && /*#__PURE__*/React.createElement("table", {
    className: "ac-doc__table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, b.table.head.map(h => /*#__PURE__*/React.createElement("th", {
    key: h
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, b.table.rows.map((r, ri) => /*#__PURE__*/React.createElement("tr", {
    key: ri
  }, r.map((c, ci) => /*#__PURE__*/React.createElement("td", {
    key: ci
  }, c)))))))));
}
function ChatPanel() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "I have your project context loaded. Ask me to refine the scope, draft a section, or pressure-test an assumption."
  }]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    if (endRef.current) endRef.current.parentElement.scrollTop = endRef.current.offsetTop;
  }, [messages]);
  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages(m => [...m, {
      role: "user",
      content: text
    }]);
    setTimeout(() => {
      setMessages(m => [...m, {
        role: "assistant",
        content: "Good call. I tightened that into the first-version scope and flagged the dependency in the MVP plan. Want me to regenerate the tech spec to match?"
      }]);
    }, 700);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-chat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-chat__head"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-square",
    size: 15
  }), "Assistant"), /*#__PURE__*/React.createElement("div", {
    className: "ac-chat__scroll"
  }, messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `ac-msg ac-msg--${m.role}`
  }, m.role === "assistant" && /*#__PURE__*/React.createElement("span", {
    className: "ac-msg__avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/maker-compass-logo.svg",
    alt: "",
    width: "16"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ac-msg__bubble"
  }, m.content))), /*#__PURE__*/React.createElement("div", {
    ref: endRef
  })), /*#__PURE__*/React.createElement("div", {
    className: "ac-composer"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    placeholder: "Describe your business idea or ask a question\u2026",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "ac-composer__send",
    onClick: send,
    disabled: !input.trim()
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up",
    size: 16
  }))));
}
function WorkspaceView({
  project,
  onBack
}) {
  const [tab, setTab] = useState("Competitive");
  return /*#__PURE__*/React.createElement("div", {
    className: "ac-workspace"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-wshead"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ac-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), "Projects"), /*#__PURE__*/React.createElement("div", {
    className: "ac-wshead__row"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "ac-wshead__title"
  }, project.name), /*#__PURE__*/React.createElement("span", {
    className: "ac-status ac-status--done"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Generated")), /*#__PURE__*/React.createElement("nav", {
    className: "ac-tabs"
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `ac-tab ${tab === t ? "is-active" : ""}`,
    onClick: () => setTab(t)
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "ac-wsbody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ac-wsdoc"
  }, /*#__PURE__*/React.createElement(Artifact, {
    tab: tab
  })), /*#__PURE__*/React.createElement(ChatPanel, null)));
}
Object.assign(window, {
  ProjectsView,
  IntakeView,
  WorkspaceView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-app/views.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-landing/app.jsx
try { (() => {
/* global React, ReactDOM, Icon, Button, LandingNav, LandingFooter, Hero, BuildMap, Features, HowItWorks, Pricing, BottomCTA */
// Maker Compass — Landing kit: app shell (auth modal, toast, interactivity)

const {
  useState,
  useEffect
} = React;
function AuthModal({
  mode,
  prefillIdea,
  onClose,
  onSwitch,
  onSubmit
}) {
  const isSignup = mode === "signup";
  return /*#__PURE__*/React.createElement("div", {
    className: "mc-modal-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-modal",
    style: {
      position: "relative"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "mc-modal__close",
    onClick: onClose,
    "aria-label": "Close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  })), /*#__PURE__*/React.createElement("h2", {
    className: "mc-modal__title"
  }, isSignup ? "Create your account" : "Welcome back"), /*#__PURE__*/React.createElement("p", {
    className: "mc-modal__sub"
  }, prefillIdea ? /*#__PURE__*/React.createElement(React.Fragment, null, "Save your idea and turn it into a full plan: ", /*#__PURE__*/React.createElement("strong", null, "\u201C", prefillIdea, "\u201D")) : isSignup ? "Start turning ideas into shippable plans." : "Sign in to pick up where you left off."), /*#__PURE__*/React.createElement("button", {
    className: "mc-modal__google"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/google-logo.svg",
    alt: ""
  }), "Continue with Google"), /*#__PURE__*/React.createElement("div", {
    className: "mc-modal__divider"
  }, "or"), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-field"
  }, /*#__PURE__*/React.createElement("label", null, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "you@example.com",
    required: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "mc-field"
  }, /*#__PURE__*/React.createElement("label", null, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    required: true
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    style: {
      width: "100%",
      marginTop: 6
    }
  }, isSignup ? "Create account" : "Sign in")), /*#__PURE__*/React.createElement("div", {
    className: "mc-modal__foot"
  }, isSignup ? "Already have an account? " : "New to Maker Compass? ", /*#__PURE__*/React.createElement("a", {
    onClick: () => onSwitch(isSignup ? "signin" : "signup")
  }, isSignup ? "Sign in" : "Create one"))));
}
function App() {
  const [modal, setModal] = useState(null); // null | {mode, idea}
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(LandingNav, {
    onSignIn: () => setModal({
      mode: "signin"
    }),
    onGetStarted: () => setModal({
      mode: "signup"
    })
  }), /*#__PURE__*/React.createElement(Hero, {
    onSubmitIdea: idea => setModal({
      mode: "signup",
      idea
    })
  }), /*#__PURE__*/React.createElement(BuildMap, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(HowItWorks, null), /*#__PURE__*/React.createElement(Pricing, null), /*#__PURE__*/React.createElement(BottomCTA, {
    onGetStarted: () => setModal({
      mode: "signup"
    })
  }), /*#__PURE__*/React.createElement(LandingFooter, null), modal && /*#__PURE__*/React.createElement(AuthModal, {
    mode: modal.mode,
    prefillIdea: modal.idea,
    onClose: () => setModal(null),
    onSwitch: m => setModal({
      mode: m,
      idea: modal.idea
    }),
    onSubmit: () => {
      setModal(null);
      setToast(modal.mode === "signup" ? "Account created. Welcome aboard." : "Signed in.");
    }
  }), toast && /*#__PURE__*/React.createElement("div", {
    className: "mc-toast"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    style: {
      color: "var(--success)"
    }
  }), toast));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-landing/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-landing/components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, lucide */
// Maker Compass — Landing kit: shared components (Button, Icon, Nav, Footer)

const {
  useEffect,
  useRef
} = React;

// Lucide icon — renders the SVG by name. Re-creates after mount.
function Icon({
  name,
  size = 16,
  className = "",
  style = {}
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size
        },
        nameAttr: "data-lucide"
      });
    }
  }, [name, size]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: className,
    style: {
      display: "inline-flex",
      lineHeight: 0,
      ...style
    }
  });
}
function Button({
  variant = "primary",
  size = "default",
  sharp = false,
  children,
  className = "",
  ...props
}) {
  const cls = ["mc-btn", `mc-btn--${variant}`, `mc-btn--${size}`, sharp ? "mc-btn--sharp" : "", className].join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, props), children);
}
const NAV_LINKS = [{
  label: "Features",
  href: "#features"
}, {
  label: "How It Works",
  href: "#how-it-works"
}, {
  label: "Pricing",
  href: "#pricing"
}];
function LandingNav({
  onSignIn,
  onGetStarted
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "mc-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-nav__inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "mc-lockup",
    href: "#top"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/maker-compass-logo.svg",
    alt: "Maker Compass",
    width: "34",
    height: "34"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mc-lockup__word"
  }, "Maker Compass")), /*#__PURE__*/React.createElement("nav", {
    className: "mc-nav__links"
  }, NAV_LINKS.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.label,
    href: l.href
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    className: "mc-nav__actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: onSignIn
  }, "Sign In"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onGetStarted
  }, "Get Started"))));
}
function LandingFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "mc-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-container mc-footer__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label",
    style: {
      color: "var(--text-muted)"
    }
  }, "\xA9 2026 Maker Compass. All rights reserved."), /*#__PURE__*/React.createElement("div", {
    className: "mc-footer__links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Terms"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contact"))));
}
Object.assign(window, {
  Icon,
  Button,
  LandingNav,
  LandingFooter,
  NAV_LINKS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-landing/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/maker-compass-landing/sections.jsx
try { (() => {
/* global React, Icon, Button */
// Maker Compass — Landing kit: page sections

const {
  useState,
  useEffect,
  useRef
} = React;

/* ---- Hero with idea-capture input -------------------------------------- */
function Hero({
  onSubmitIdea
}) {
  const [idea, setIdea] = useState("");
  return /*#__PURE__*/React.createElement("section", {
    className: "mc-hero",
    id: "top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-container mc-hero__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-pill mc-label"
  }, "Lean-in workflow for builders"), /*#__PURE__*/React.createElement("h1", {
    className: "mc-hero__title"
  }, "Build your startup idea this weekend, not \u201Csomeday.\u201D"), /*#__PURE__*/React.createElement("form", {
    className: "mc-idea",
    onSubmit: e => {
      e.preventDefault();
      if (idea.trim()) onSubmitIdea(idea.trim());
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "mc-idea__input",
    placeholder: "Describe your idea in one line\u2026",
    value: idea,
    onChange: e => setIdea(e.target.value)
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    type: "submit"
  }, "Get Started ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 16
  }))), /*#__PURE__*/React.createElement("p", {
    className: "mc-hero__sub"
  }, "Turn one idea into research, MVP plan, and actionable mockups in minutes. No fluff. No \u201Cwhere do I start?\u201D spiral.")));
}

/* ---- Build Map (signature scroll-triggered graphic) -------------------- */
const BUILD_NODES = [{
  x: 8,
  label: "Idea",
  caption: "One line in"
}, {
  x: 33,
  label: "Research",
  caption: "Market + competitors"
}, {
  x: 58,
  label: "Plan",
  caption: "PRD + MVP scope"
}, {
  x: 83,
  label: "Ship",
  caption: "Hand to your agent"
}];
function BuildMap() {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        io.disconnect();
      }
    }, {
      threshold: 0.35
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    className: `mc-buildmap ${active ? "is-active" : ""}`,
    ref: ref
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label mc-buildmap__kicker"
  }, "The Build Map"), /*#__PURE__*/React.createElement("h2", {
    className: "mc-buildmap__title"
  }, "One intake becomes every core artifact."), /*#__PURE__*/React.createElement("div", {
    className: "mc-buildmap__stage"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 22",
    preserveAspectRatio: "none",
    className: "mc-buildmap__svg"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "11",
    x2: "94",
    y2: "11",
    className: "mc-bm-base"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "11",
    x2: "94",
    y2: "11",
    className: "mc-bm-progress"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mc-buildmap__nodes"
  }, BUILD_NODES.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: n.label,
    className: "mc-bm-card",
    style: {
      left: `${n.x}%`,
      "--bm-delay": `${0.5 + i * 0.55}s`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-bm-dot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mc-bm-cardbody"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label",
    style: {
      color: "var(--action-red)"
    }
  }, `0${i + 1}`), /*#__PURE__*/React.createElement("div", {
    className: "mc-bm-cardtitle"
  }, n.label), /*#__PURE__*/React.createElement("div", {
    className: "mc-bm-cardcap"
  }, n.caption)))))));
}

/* ---- Features ----------------------------------------------------------- */
const OUTPUTS = [{
  eyebrow: "Research",
  title: "Know the market before you commit a sprint.",
  description: "Maker Compass maps competitors, pricing, positioning, gaps, and first wedges so your idea starts with context instead of guesswork.",
  artifacts: ["Competitive scan", "Audience segments", "Differentiation wedges"]
}, {
  eyebrow: "Product",
  title: "Turn the idea into a buildable plan.",
  description: "Generate the product plan, first-version scope, acceptance criteria, mockup directions, and technical blueprint your coding agent needs to start cleanly.",
  artifacts: ["Product plan", "First version plan", "Design mockups", "Technical spec"]
}];
const SIGNALS = ["One intake becomes every core artifact.", "Docs stay tied to the same project context.", "Output is written for builders, not slide decks."];
function Features() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mc-section",
    id: "features"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "Features"), /*#__PURE__*/React.createElement("h2", {
    className: "mc-section__title"
  }, "From idea to momentum, without the usual excuses"), /*#__PURE__*/React.createElement("div", {
    className: "mc-features"
  }, OUTPUTS.map(o => /*#__PURE__*/React.createElement("article", {
    key: o.eyebrow,
    className: "mc-feature"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label",
    style: {
      color: "var(--text-muted)"
    }
  }, o.eyebrow), /*#__PURE__*/React.createElement("h3", {
    className: "mc-feature__title"
  }, o.title), /*#__PURE__*/React.createElement("p", {
    className: "mc-feature__desc"
  }, o.description), /*#__PURE__*/React.createElement("div", {
    className: "mc-feature__tags"
  }, o.artifacts.map(a => /*#__PURE__*/React.createElement("span", {
    key: a,
    className: "mc-tag"
  }, a)))))), /*#__PURE__*/React.createElement("div", {
    className: "mc-signals"
  }, SIGNALS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: "mc-signal"
  }, s))));
}

/* ---- How it works ------------------------------------------------------- */
const STEPS = [{
  n: "01",
  title: "Describe what you want to build",
  body: "Share your idea, target users, and constraints in plain language."
}, {
  n: "02",
  title: "Generate research + product direction",
  body: "Get focused analysis, key assumptions, and where your idea can stand out."
}, {
  n: "03",
  title: "Create your first-version plan + mockups",
  body: "Produce actionable docs and compare design directions before implementation."
}, {
  n: "04",
  title: "Build and iterate",
  body: "Ship faster with a clear plan, then refine with feedback as you learn from users."
}];
function HowItWorks() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mc-section",
    id: "how-it-works"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "How It Works"), /*#__PURE__*/React.createElement("h2", {
    className: "mc-section__title"
  }, "Your first version, broken into clear steps"), /*#__PURE__*/React.createElement("div", {
    className: "mc-steps"
  }, STEPS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    className: "mc-step"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-step__num"
  }, s.n), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mc-step__title"
  }, s.title), /*#__PURE__*/React.createElement("p", {
    className: "mc-step__body"
  }, s.body))))));
}

/* ---- Pricing ------------------------------------------------------------ */
const PLANS = [{
  name: "Free",
  price: "$0/mo",
  points: ["40 tokens included", "~1 full report (fast model)", "Community support"],
  cta: "Choose Free",
  dark: false
}, {
  name: "Starter",
  price: "$29/mo",
  points: ["250 tokens monthly", "~5 full reports (balanced)", "Product plan + tech spec export"],
  cta: "Start Starter",
  dark: false
}, {
  name: "Pro",
  price: "$79/mo",
  points: ["900 tokens monthly", "~16 full reports (thinking)", "App generation + priority support"],
  cta: "Go Pro",
  dark: true
}, {
  name: "Enterprise",
  price: "Custom",
  points: ["Custom token pools", "Dedicated VPC", "SSO + RBAC", "Custom integrations"],
  cta: "Talk to Sales",
  dark: false
}];
function Pricing() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mc-section",
    id: "pricing"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mc-label"
  }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
    className: "mc-section__title"
  }, "Plans For Builders At Every Stage"), /*#__PURE__*/React.createElement("p", {
    className: "mc-section__lead"
  }, "1 token = $0.20. Full report estimate: fast 28 tokens, balanced 42 tokens, thinking 53 tokens."), /*#__PURE__*/React.createElement("div", {
    className: "mc-plans"
  }, PLANS.map(p => /*#__PURE__*/React.createElement("article", {
    key: p.name,
    className: `mc-plan ${p.dark ? "mc-plan--dark" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-plan__head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mc-plan__name"
  }, p.name), p.dark && /*#__PURE__*/React.createElement("span", {
    className: "mc-plan__badge"
  }, "Best Value")), /*#__PURE__*/React.createElement("p", {
    className: "mc-plan__price"
  }, p.price), /*#__PURE__*/React.createElement("div", {
    className: "mc-plan__points"
  }, p.points.map(pt => /*#__PURE__*/React.createElement("p", {
    key: pt
  }, pt))), /*#__PURE__*/React.createElement(Button, {
    variant: p.dark ? "primary" : "outline",
    className: "mc-plan__cta"
  }, p.cta)))));
}

/* ---- Bottom CTA --------------------------------------------------------- */
function BottomCTA({
  onGetStarted
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "mc-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mc-container",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "mc-cta__title"
  }, "Stop waiting. Start building."), /*#__PURE__*/React.createElement("p", {
    className: "mc-cta__sub"
  }, "Get early access and turn your next idea into research, plans, and mockups you can actually execute."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    sharp: true,
    size: "lg",
    onClick: onGetStarted,
    style: {
      marginTop: 28
    }
  }, "Get Started ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 16
  }))));
}
Object.assign(window, {
  Hero,
  BuildMap,
  Features,
  HowItWorks,
  Pricing,
  BottomCTA
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/maker-compass-landing/sections.jsx", error: String((e && e.message) || e) }); }

})();
