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
const val = $("#f-val");
if (val) {
  let estrellas = 5;
  const sb = $$(".stars button", val);
  const pinta = () => sb.forEach((b, k) => { b.classList.toggle("on", k < estrellas); b.setAttribute("aria-pressed", k < estrellas); });
  sb.forEach((b, k) => b.addEventListener("click", () => { estrellas = k + 1; pinta(); }));
  pinta();
  val.addEventListener("submit", e => {
    e.preventDefault();
    if (val.website && val.website.value) return;
    if (!val.reportValidity()) return;
    const f = new FormData(val);
    const L = [
      "Hola, WandyWise Health Systems. Quiero compartir mi valoración:", "",
      "Satisfacción: " + "★".repeat(estrellas) + "☆".repeat(5 - estrellas) + " (" + estrellas + "/5)",
      "Nombre: " + f.get("nombre"),
      "Especialidad: " + f.get("especialidad"),
      "Provincia: " + f.get("provincia"),
      "Sistema: " + f.get("sistema"),
      "Usuario desde: " + (f.get("desde") || "—"), "",
      "Comentario: " + f.get("comentario"), "",
      "Autorizo publicar mi nombre, especialidad, provincia y comentario en wandywise.com.",
    ];
    abrirWA(L.join("\n"));
  });
}
