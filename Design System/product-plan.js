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
    top.appendChild(el("p", "sstory",
      "As a <b>" + s.role + "</b>, I want to " + s.want + ", so that " + s.so + "."));
    card.appendChild(top);

    const det = el("details", "pp-ac");
    const sum = el("summary", null,
      "Acceptance criteria (" + s.ac.length + ")<span data-lucide=\"chevron-down\" class=\"chev\"></span>");
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
    g.items.forEach(function (it) { ul.appendChild(el("li", null, "<span>" + it + "</span>")); });
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
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  const sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  const spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        links.forEach(function (l) { l.classList.remove("active"); });
        const a = map[en.target.id];
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
  sections.forEach(function (s) { if (s) spy.observe(s); });

  /* ---- Build Map timeline reveal ---- */
  const delivery = document.getElementById("delivery");
  const progress = document.getElementById("bmProgress");
  const phases = Array.prototype.slice.call(document.querySelectorAll("[data-phase]"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    if (progress) progress.style.width = "67%";
    phases.forEach(function (p) { p.classList.add("in"); });
  } else if (delivery) {
    const tObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (progress) progress.style.width = "67%"; /* weeks 1-8 of 12 */
          phases.forEach(function (p, i) {
            setTimeout(function () { p.classList.add("in"); }, 120 + i * 140);
          });
          tObs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    tObs.observe(delivery);
  }
})();
