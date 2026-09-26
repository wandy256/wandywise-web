// Visor de sistemas: amplía una captura, explica lo que se ve y resume el sistema.
// Uso: <button data-visor="kids" data-slide="kids-curvas">…</button>
//      o window.dispatchEvent(new CustomEvent("visor:abrir", {detail:{id:"kids", slide:"kids-curvas"}}))
(() => {
  const nodo = document.getElementById("visor-data");
  if (!nodo) return;
  let DATA = {};
  try { DATA = JSON.parse(nodo.textContent); } catch { return; }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dlg = document.createElement("dialog");
  dlg.className = "visor";
  dlg.setAttribute("aria-labelledby", "visor-t");
  dlg.innerHTML = `
    <div class="vz-shell">
      <div class="vz-stage">
        <div class="vz-view" tabindex="0" aria-label="Captura ampliada. Toca para acercar.">
          <img class="vz-img" alt="">
        </div>
        <button type="button" class="vz-nav prev" aria-label="Anterior">‹</button>
        <button type="button" class="vz-nav next" aria-label="Siguiente">›</button>
        <div class="vz-bar"><span class="vz-count"></span><span class="vz-hint">Toca la imagen para acercar</span></div>
        <div class="vz-thumbs" role="tablist" aria-label="Pantallas"></div>
      </div>
      <aside class="vz-info">
        <button type="button" class="vz-close" aria-label="Cerrar">×</button>
        <p class="vz-eyebrow"></p>
        <h2 id="visor-t" class="vz-title"></h2>
        <p class="vz-intro"></p>
        <section class="vz-now" aria-live="polite">
          <span class="vz-label">Lo que estás viendo</span>
          <h3 class="vz-st"></h3>
          <p class="vz-sd"></p>
        </section>
        <section class="vz-sum" hidden>
          <div class="vz-tabs" role="tablist" aria-label="Resumen del sistema"></div>
          <ul class="vz-list"></ul>
        </section>
        <div class="vz-cta"></div>
      </aside>
    </div>`;
  document.body.appendChild(dlg);

  const $ = (s) => dlg.querySelector(s);
  const img = $(".vz-img"), view = $(".vz-view");
  let actual = null, idx = 0, tab = 0, zoom = false, abiertoDesde = null;

  function pintarSlide(anim = true) {
    const sl = actual.slides[idx];
    const n = actual.slides.length;
    setZoom(false);
    const poner = () => {
      img.src = sl.src; img.alt = sl.t;
      view.classList.toggle("doc", !!sl.doc); view.classList.toggle("is-mock", !!sl.mock);
      $(".vz-st").textContent = sl.t;
      $(".vz-sd").textContent = sl.d;
      $(".vz-count").textContent = `${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      dlg.querySelectorAll(".vz-thumbs button").forEach((b, i) => b.setAttribute("aria-selected", i === idx));
      const act = dlg.querySelector(`.vz-thumbs button[aria-selected="true"]`);
      act?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
    };
    if (anim && !reduce && img.src) {
      img.classList.add("sale");
      setTimeout(() => { poner(); img.classList.remove("sale"); }, 160);
    } else poner();
    $(".vz-nav.prev").hidden = $(".vz-nav.next").hidden = n < 2;
    $(".vz-thumbs").hidden = n < 2;
    // precarga de la siguiente
    if (n > 1) { const p = new Image(); p.src = actual.slides[(idx + 1) % n].src; }
  }

  function pintarResumen() {
    const r = actual.resumen, box = $(".vz-sum");
    if (!r) { box.hidden = true; return; }
    box.hidden = false;
    const claves = Object.keys(r);
    $(".vz-tabs").innerHTML = claves.map((k, i) =>
      `<button type="button" role="tab" aria-selected="${i === tab}" data-tab="${i}">${esc(k)}</button>`).join("");
    $(".vz-list").innerHTML = r[claves[tab]].map((x) => `<li>${esc(x)}</li>`).join("");
  }

  function abrir(id, slide) {
    const d = DATA[id]; if (!d) return;
    actual = d; tab = 0;
    idx = Math.max(0, d.slides.findIndex((s) => slide && s.src.includes(`/${slide}.webp`)));
    dlg.dataset.tema = d.tema || "";
    $(".vz-eyebrow").textContent = d.eyebrow || "";
    $(".vz-title").textContent = d.titulo || "";
    $(".vz-intro").textContent = d.intro || "";
    $(".vz-thumbs").innerHTML = d.slides.map((s, i) =>
      `<button type="button" role="tab" aria-selected="false" data-i="${i}" title="${esc(s.t)}"><img src="${esc(s.src)}" alt="" loading="lazy"><span>${esc(s.t)}</span></button>`).join("");
    const demo = `<a class="btn primary" href="/demo/">Solicitar una demostración</a>`;
    $(".vz-cta").innerHTML = (d.link && location.pathname !== d.link[0] ? `<a class="btn ghost" href="${esc(d.link[0])}">${esc(d.link[1])} →</a>` : "") + demo;
    img.removeAttribute("src");
    pintarSlide(false);
    pintarResumen();
    abiertoDesde = document.activeElement;
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add("visor-abierto");
    $(".vz-close").focus({ preventScroll: true });
  }
  function cerrar() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("visor-abierto");
    setZoom(false);
    abiertoDesde?.focus?.({ preventScroll: true });
  });
  const mover = (k) => { if (!actual || actual.slides.length < 2) return; idx = (idx + k + actual.slides.length) % actual.slides.length; pintarSlide(); };

  // ── Acercar / alejar la captura ──
  function setZoom(z, ev) {
    zoom = z; view.classList.toggle("zoom", z);
    $(".vz-hint").textContent = z ? "Mueve para recorrer · toca para alejar" : "Toca la imagen para acercar";
    if (!z) { img.style.transformOrigin = "50% 50%"; return; }
    if (ev) origen(ev);
  }
  function origen(ev) {
    const r = view.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 100, y = ((ev.clientY - r.top) / r.height) * 100;
    img.style.transformOrigin = `${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`;
  }
  view.addEventListener("click", (e) => { if (!arrastre) setZoom(!zoom, e); });
  view.addEventListener("pointermove", (e) => { if (zoom && e.pointerType === "mouse") origen(e); });
  view.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoom(!zoom); } });

  // ── Deslizar en pantallas táctiles ──
  let x0 = null, y0 = 0, arrastre = false;
  view.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; arrastre = false; }, { passive: true });
  view.addEventListener("touchmove", (e) => {
    if (x0 === null) return;
    if (zoom) { origen(e.touches[0]); arrastre = true; return; }
    const dx = e.touches[0].clientX - x0;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.touches[0].clientY - y0)) arrastre = true;
  }, { passive: true });
  view.addEventListener("touchend", (e) => {
    if (x0 !== null && !zoom) {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
    }
    x0 = null; setTimeout(() => (arrastre = false), 50);
  });

  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) return cerrar(); // clic en el fondo
    const t = e.target.closest("button"); if (!t) return;
    if (t.classList.contains("vz-close")) cerrar();
    else if (t.classList.contains("prev")) mover(-1);
    else if (t.classList.contains("next")) mover(1);
    else if (t.dataset.i !== undefined) { idx = +t.dataset.i; pintarSlide(); }
    else if (t.dataset.tab !== undefined) { tab = +t.dataset.tab; pintarResumen(); }
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.target.closest(".vz-tabs")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); mover(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); mover(-1); }
  });

  // ── Disparadores ──
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-visor]");
    if (!b || dlg.contains(b)) return;
    e.preventDefault();
    abrir(b.dataset.visor, b.dataset.slide);
  });
  addEventListener("visor:abrir", (e) => abrir(e.detail.id, e.detail.slide));
  window.WWVisor = { abrir, cerrar };
})();
