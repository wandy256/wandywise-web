// WandyWise Health Systems — comportamiento del sitio
const WA = "18283786106";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Menú móvil
const mb = $(".menu-btn"), nav = $(".nav");
if (mb && nav) {
  mb.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    mb.setAttribute("aria-expanded", open);
  });
  $$("a", nav).forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); }));
}
const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

// Galerías con lista de módulos
$$("[data-gallery]").forEach(g => {
  const items = JSON.parse(g.querySelector("script[type='application/json']").textContent);
  const img = $(".view img", g), h = $(".cap h3", g), p = $(".cap p", g), c = $(".cap .count", g);
  const btns = $$("ol button", g);
  let i = 0, timer = null;
  const show = n => {
    i = (n + items.length) % items.length;
    const it = items[i];
    img.src = it.src; img.alt = it.alt || it.t; h.textContent = it.t; p.textContent = it.d;
    if (c) c.textContent = String(i + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    btns.forEach((b, k) => b.setAttribute("aria-pressed", k === i));
  };
  btns.forEach((b, k) => b.addEventListener("click", () => { show(k); stop(); }));
  $$("[data-dir]", g).forEach(b => b.addEventListener("click", () => { show(i + (+b.dataset.dir)); stop(); }));
  const auto = g.dataset.auto && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  if (auto) timer = setInterval(() => show(i + 1), +g.dataset.auto);
  show(0);
});

// Formularios que terminan en WhatsApp
function abrirWA(texto) {
  window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
}
const demo = $("#f-demo");
if (demo) {
  demo.addEventListener("submit", e => {
    e.preventDefault();
    if (demo.website && demo.website.value) return; // trampa anti‑spam
    if (!demo.reportValidity()) return;
    const f = new FormData(demo);
    const intereses = f.getAll("interes").join(", ") || "Sin especificar";
    const L = [
      "Hola, WandyWise Health Systems. Deseo agendar una demostración.", "",
      "Nombre: " + f.get("nombre"),
      "Especialidad: " + f.get("especialidad"),
      "Correo: " + f.get("correo"),
      "WhatsApp: " + f.get("telefono"),
      "Me interesa: " + intereses,
    ];
    if ((f.get("mejorar") || "").trim()) L.push("Quiero mejorar: " + f.get("mejorar").trim());
    abrirWA(L.join("\n"));
  });
}
// ─────────────────────────────────────────────────────────────
// API del sitio (visitas, valoraciones, servicio misceláneo)
// ─────────────────────────────────────────────────────────────
const API = "https://okrfxnhwpdkumaqovfrs.supabase.co/functions/v1/sitio-publico";
async function api(accion, datos = {}) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, ...datos }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No pudimos completar la solicitud.");
  return j;
}
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animaciones al entrar en pantalla (barras, curvas, contadores, tarjetas flotantes)
const contar = el => {
  const fin = +el.dataset.count, dec = el.dataset.dec ? +el.dataset.dec : 0, pad = el.dataset.pad ? +el.dataset.pad : 0;
  const fmt = v => { let t = v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); return pad ? t.padStart(pad, "0") : t; };
  if (reduce) { el.textContent = fmt(fin); return; }
  const t0 = performance.now(), dur = 1100;
  const paso = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(dec ? fin * e : Math.round(fin * e)); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
};
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in-view");
  $$("[data-count]", e.target).forEach(contar);
  $$(".ring[data-p]", e.target).forEach(r => r.style.setProperty("--p", r.dataset.p));
  io.unobserve(e.target);
}), { threshold: 0.25 });
$$("[data-anim]").forEach(el => io.observe(el));

// Selector Kids / GynCare del panel de inicio
$$("[data-switch]").forEach(g => {
  const mock = $(g.dataset.switch);
  $$("button", g).forEach(b => b.addEventListener("click", () => {
    $$("button", g).forEach(x => x.setAttribute("aria-pressed", x === b));
    const gyn = b.dataset.v === "gyn";
    mock.classList.toggle("gyn", gyn);
    $$("[data-kids]", mock).forEach(n => n.textContent = gyn ? n.dataset.gyn : n.dataset.kids);
    mock.classList.remove("in-view"); void mock.offsetWidth;
    requestAnimationFrame(() => { mock.classList.add("in-view"); $$("[data-count]", mock).forEach(contar); });
  }));
});

// Carruseles automáticos y fluidos
//   data-carousel="marquee" data-speed="px/seg"  → desplazamiento continuo
//   data-carousel="slide"   data-interval="ms"    → pasa de uno en uno con transición suave
$$("[data-carousel]").forEach(c => {
  const vp = $(".track", c), dots = $(".dots", c);
  const modo = c.dataset.carousel === "marquee" ? "marquee" : "slide";
  vp.classList.add("vp");
  const rail = document.createElement("div"); rail.className = "rail";
  while (vp.firstChild) rail.appendChild(vp.firstChild);
  vp.appendChild(rail);
  const originales = $$(".slide", rail);
  let pausa = false, arrastre = null, movido = false;
  const gap = () => parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 0;
  const paso = () => (originales[0]?.getBoundingClientRect().width || vp.clientWidth) + gap();
  ["mouseenter", "focusin"].forEach(ev => c.addEventListener(ev, () => pausa = true));
  ["mouseleave", "focusout"].forEach(ev => c.addEventListener(ev, () => pausa = false));

  if (modo === "marquee") {
    // Duplica las diapositivas para un bucle continuo sin saltos
    originales.forEach(s => { const k = s.cloneNode(true); k.setAttribute("aria-hidden", "true"); $$("a,button,img", k).forEach(n => n.setAttribute("tabindex", "-1")); rail.appendChild(k); });
    if (dots) dots.remove();
    const vel = +(c.dataset.speed || 40);
    let x = 0, prev = performance.now(), anim = null;
    const ancho = () => originales.reduce((t, s) => t + s.getBoundingClientRect().width, 0) + gap() * originales.length;
    const aplicar = () => { const w = ancho(); if (w) { x = ((x % w) + w) % w; } rail.style.transform = `translate3d(${-x}px,0,0)`; };
    const tick = t => {
      const dt = Math.min(64, t - prev); prev = t;
      if (anim) { const k = Math.min(1, (t - anim.t0) / 450), e = 1 - Math.pow(1 - k, 3); x = anim.de + (anim.a - anim.de) * e; if (k >= 1) anim = null; }
      else if (!pausa && !arrastre && !reduce && !document.hidden) x += vel * dt / 1000;
      aplicar(); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    $$("[data-dir]", c).forEach(b => b.addEventListener("click", () => { anim = { de: x, a: x + paso() * +b.dataset.dir, t0: performance.now() }; }));
    vp.addEventListener("pointerdown", e => { arrastre = { x0: e.clientX, base: x }; movido = false; });
    addEventListener("pointermove", e => { if (!arrastre) return; const d = e.clientX - arrastre.x0; if (Math.abs(d) > 6) movido = true; x = arrastre.base - d; });
    addEventListener("pointerup", () => { arrastre = null; });
  } else {
    let i = 0, timer = null;
    const n = originales.length;
    const ir = k => {
      i = (k + n) % n;
      rail.style.transform = `translate3d(${-i * paso()}px,0,0)`;
      if (dots) dots.innerHTML = originales.map((_, j) => `<button type="button" aria-label="Ir a ${j + 1}" ${j === i ? 'aria-current="true"' : ""}></button>`).join("");
    };
    const reiniciar = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => { if (!pausa && !arrastre && !document.hidden) ir(i + 1); }, +(c.dataset.interval || 4500)); };
    dots?.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { ir([...dots.children].indexOf(b)); reiniciar(); } });
    $$("[data-dir]", c).forEach(b => b.addEventListener("click", () => { ir(i + +b.dataset.dir); reiniciar(); }));
    vp.addEventListener("pointerdown", e => { arrastre = { x0: e.clientX }; movido = false; rail.style.transition = "none"; });
    addEventListener("pointermove", e => { if (!arrastre) return; const d = e.clientX - arrastre.x0; if (Math.abs(d) > 6) movido = true; rail.style.transform = `translate3d(${-i * paso() + d}px,0,0)`; });
    addEventListener("pointerup", e => { if (!arrastre) return; const d = e.clientX - arrastre.x0; arrastre = null; rail.style.transition = ""; ir(Math.abs(d) > 50 ? i - Math.sign(d) : i); reiniciar(); });
    addEventListener("resize", () => ir(i));
    ir(0); reiniciar();
  }
  // Un arrastre no debe abrir la imagen
  vp.addEventListener("click", e => { if (movido) { e.stopPropagation(); e.preventDefault(); movido = false; } }, true);
  vp.addEventListener("dragstart", e => e.preventDefault());
});

// Visor de imágenes ampliadas
(() => {
  let grupo = [], k = 0, box = null;
  const ver = () => {
    const im = grupo[k];
    box.querySelector("img").src = im.dataset.full || im.currentSrc || im.src;
    box.querySelector("img").alt = im.alt;
    box.querySelector("p").textContent = im.alt;
  };
  const cerrar = () => { box?.remove(); box = null; document.body.style.overflow = ""; };
  const abrir = (img) => {
    const g = img.dataset.zoom || "x";
    grupo = $$(`img[data-zoom="${g}"]`); k = Math.max(0, grupo.indexOf(img));
    box = document.createElement("div"); box.className = "lb"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = `<figure style="margin:0"><img alt=""><p></p></figure><button class="x" aria-label="Cerrar">×</button>${grupo.length > 1 ? '<button class="pv" aria-label="Anterior">←</button><button class="nx" aria-label="Siguiente">→</button>' : ""}`;
    box.addEventListener("click", e => {
      if (e.target === box || e.target.closest(".x")) cerrar();
      else if (e.target.closest(".pv")) { k = (k - 1 + grupo.length) % grupo.length; ver(); }
      else if (e.target.closest(".nx")) { k = (k + 1) % grupo.length; ver(); }
    });
    document.body.appendChild(box); document.body.style.overflow = "hidden"; ver(); box.querySelector(".x").focus();
  };
  document.addEventListener("click", e => {
    const img = e.target.closest("img[data-zoom]"); if (img) { abrir(img); return; }
    const b = e.target.closest("[data-zoom-target]"); if (b) { const t = $(b.dataset.zoomTarget); if (t) abrir(t); }
  });
  document.addEventListener("keydown", e => {
    if (!box) return;
    if (e.key === "Escape") cerrar();
    if (e.key === "ArrowRight" && grupo.length > 1) { k = (k + 1) % grupo.length; ver(); }
    if (e.key === "ArrowLeft" && grupo.length > 1) { k = (k - 1 + grupo.length) % grupo.length; ver(); }
  });
})();

// Contador de visitas (suma una vez por sesión del navegador)
(async () => {
  const el = $("#visitas"); if (!el) return;
  let nueva = true;
  try { nueva = !sessionStorage.getItem("wwhs_visita"); sessionStorage.setItem("wwhs_visita", "1"); } catch (_) {}
  try { const { total } = await api("visita", { nueva }); el.textContent = Number(total).toLocaleString("es-DO"); el.closest(".visits").hidden = false; } catch (_) {}
})();

// Valoraciones publicadas
const rvList = $("#rv-list");
async function cargarValoraciones() {
  if (!rvList) return;
  try {
    const { valoraciones } = await api("valoraciones");
    if (!valoraciones.length) { rvList.innerHTML = '<div class="rv-empty">Sé el primer especialista en compartir su experiencia con Wise.</div>'; return; }
    rvList.innerHTML = '<div class="reviews">' + valoraciones.map(v => `
      <article class="review">
        <span class="st" aria-label="${v.estrellas} de 5 estrellas">${"★".repeat(v.estrellas)}${"☆".repeat(5 - v.estrellas)}</span>
        <p>“${esc(v.comentario)}”</p>
        <div class="by"><b>${esc(v.nombre)}</b><small>${esc(v.especialidad)} · ${esc(v.provincia)}${v.desde ? " · Usuaria desde " + esc(v.desde) : ""}</small></div>
        <span class="sys-tag ${v.sistema.includes("GynCare") ? "g" : ""}">${esc(v.sistema)}</span>
      </article>`).join("") + "</div>";
  } catch (_) { rvList.innerHTML = ""; }
}
cargarValoraciones();

const val = $("#f-val");
if (val) {
  let estrellas = 5;
  const sb = $$(".stars button", val);
  const pinta = () => sb.forEach((b, k) => { b.classList.toggle("on", k < estrellas); b.setAttribute("aria-pressed", k < estrellas); });
  sb.forEach((b, k) => b.addEventListener("click", () => { estrellas = k + 1; pinta(); }));
  pinta();
  const msg = $("#val-msg"), btn = $("button[type=submit]", val);
  val.addEventListener("submit", async e => {
    e.preventDefault();
    if (!val.reportValidity()) return;
    const f = new FormData(val);
    btn.disabled = true; msg.hidden = true;
    try {
      await api("valorar", {
        nombre: f.get("nombre"), especialidad: f.get("especialidad"), provincia: f.get("provincia"),
        sistema: f.get("sistema"), desde: f.get("desde"), comentario: f.get("comentario"),
        estrellas, autoriza: true, website: f.get("website"),
      });
      val.reset(); estrellas = 5; pinta();
      msg.className = "fmsg ok"; msg.textContent = "¡Gracias! Recibimos tu valoración. La publicaremos después de confirmarla contigo.";
    } catch (err) {
      msg.className = "fmsg err"; msg.textContent = err.message;
    }
    msg.hidden = false; btn.disabled = false;
  });
}
