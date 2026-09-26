// Portada 3D de WandyWise: paneles de cristal con capturas reales (Three.js, carga progresiva).
// Si WebGL no está disponible, el dispositivo es limitado o se prefiere menos movimiento,
// se conserva la composición CSS de respaldo (.cover-art) sin cambios.
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";

const cover = document.querySelector(".cover");
const canvas = cover && cover.querySelector(".cover-gl");
const art = cover && cover.querySelector(".cover-art");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// Progreso de desplazamiento hacia "Explora" (también en modo respaldo).
let scrollP = 0;
function onScroll() {
  if (!cover) return;
  scrollP = Math.min(1, Math.max(0, scrollY / (cover.offsetHeight * 0.9)));
  cover.style.setProperty("--cp", scrollP.toFixed(3));
}
if (cover) { addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

function puedeWebGL() {
  if (!canvas || !art || reduce.matches) return false;
  if (matchMedia("(max-width: 980px)").matches) return false;
  if ((navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) < 4) return false;
  if (navigator.connection && navigator.connection.saveData) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

const PANELES = [
  // img, ancho (unidades de escena), posición, rotación base, etiqueta
  { img: "kids-inicio", visor: "kids", w: 3.45, p: [-0.1, 0.2, 0.7], r: [0.02, -0.2, 0], etiqueta: "Wise Medical Kids" },
  { img: "gyn-inicio", visor: "gyn", w: 2.85, p: [1.5, 1.45, -1.7], r: [0.03, -0.27, 0.01], etiqueta: "Wise Medical GynCare" },
  { img: "kids-curvas", visor: "kids", w: 2.05, p: [-1.15, -1.35, 1.6], r: [-0.02, -0.15, -0.01] },
  { img: "gyn-prenatal", visor: "gyn", w: 2.2, p: [1.8, -1.15, -0.5], r: [-0.03, -0.3, 0.01] },
];

async function iniciar() {
  const THREE = await import(THREE_URL);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x071d38, 11, 21);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const CAM_Z = 11;
  camera.position.set(0, 0, CAM_Z);

  const raiz = new THREE.Group();   // posición/escala según la columna derecha
  const escena = new THREE.Group(); // inclinación por cursor y desplazamiento
  raiz.add(escena); scene.add(raiz);

  // ---------- utilidades ----------
  const redondeado = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const geoPlano = (w, h, r) => {
    const g = new THREE.ShapeGeometry(redondeado(w, h, r), 10);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    return g;
  };
  const texturaCanvas = (w, h, dibujar) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    dibujar(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const texResplandor = texturaCanvas(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(90,215,230,.55)"); g.addColorStop(0.45, "rgba(40,150,190,.18)"); g.addColorStop(1, "rgba(20,80,120,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const texPunto = texturaCanvas(64, 64, (x, w, h) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(170,240,255,.6)"); g.addColorStop(1, "rgba(120,220,240,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  try { await document.fonts.ready; } catch {}
  const texEtiqueta = (texto) => {
    const fs = 44, pad = 34;
    const m = document.createElement("canvas").getContext("2d");
    m.font = `600 ${fs}px Roboto, system-ui, sans-serif`;
    const tw = Math.ceil(m.measureText(texto).width), w = tw + pad * 2 + 40, h = 92;
    const t = texturaCanvas(w, h, (x) => {
      x.font = `600 ${fs}px Roboto, system-ui, sans-serif`;
      x.fillStyle = "rgba(8,32,60,.78)"; x.strokeStyle = "rgba(127,230,238,.7)"; x.lineWidth = 3;
      x.beginPath(); x.roundRect(2, 2, w - 4, h - 4, (h - 4) / 2); x.fill(); x.stroke();
      x.fillStyle = "#7fe6ee"; x.beginPath(); x.arc(pad + 8, h / 2, 9, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#f2fbff"; x.textBaseline = "middle"; x.fillText(texto, pad + 34, h / 2 + 2);
    });
    return { t, aspecto: w / h };
  };

  const sheenVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const sheenFS = `varying vec2 vUv; uniform float uShift; uniform float uOp;
    void main(){
      float d = vUv.x * 0.75 + vUv.y * 0.55;
      float banda = smoothstep(0.22, 0.0, abs(d - uShift));
      float borde = smoothstep(0.82, 1.0, vUv.y) * 0.35;
      gl_FragColor = vec4(vec3(1.0), (banda * 0.15 + borde * 0.12) * uOp);
    }`;

  // ---------- paneles ----------
  const cargador = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const cargar = (src) => new Promise((ok, mal) => cargador.load(src, ok, undefined, mal));
  const texturas = await Promise.all(PANELES.map((p) => cargar(`/img/escena/${p.img}.webp`)));

  const paneles = PANELES.map((def, i) => {
    const tex = texturas[i];
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, maxAniso);
    const w = def.w, h = w * tex.image.height / tex.image.width, r = 0.06;
    const g = new THREE.Group();

    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.55, h * 1.9),
      new THREE.MeshBasicMaterial({ map: texResplandor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    halo.position.z = -0.35; halo.renderOrder = 0; g.add(halo);

    const pad = 0.045;
    const losa = new THREE.Mesh(new THREE.ExtrudeGeometry(redondeado(w + pad * 2, h + pad * 2, r + pad), { depth: 0.05, bevelEnabled: false, curveSegments: 10 }),
      new THREE.MeshBasicMaterial({ color: 0xbfeff6, transparent: true, opacity: 0, depthWrite: false }));
    losa.position.z = -0.065; losa.renderOrder = 1; g.add(losa);

    const pantalla = new THREE.Mesh(geoPlano(w, h, r), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
    pantalla.renderOrder = 2; g.add(pantalla);

    const brillo = new THREE.Mesh(geoPlano(w, h, r), new THREE.ShaderMaterial({
      vertexShader: sheenVS, fragmentShader: sheenFS, transparent: true, depthWrite: false,
      uniforms: { uShift: { value: 0.6 }, uOp: { value: 0 } },
    }));
    brillo.position.z = 0.003; brillo.renderOrder = 3; g.add(brillo);

    const pts = redondeado(w + pad * 2, h + pad * 2, r + pad).getPoints(14);
    const marco = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x7fe6ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    marco.position.z = 0.004; marco.renderOrder = 4; g.add(marco);

    let etiqueta = null;
    if (def.etiqueta) {
      const { t, aspecto } = texEtiqueta(def.etiqueta);
      const eh = 0.2, ew = eh * aspecto;
      etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(ew, eh), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }));
      const der = def.etiquetaDer; etiqueta.position.set(der ? w / 2 - ew / 2 : -w / 2 + ew / 2, h / 2 + eh * 0.95, 0.05); etiqueta.renderOrder = 5; g.add(etiqueta);
    }

    g.position.set(...def.p); g.rotation.set(...def.r);
    escena.add(g);
    return { g, def, halo, losa, pantalla, brillo, marco, etiqueta, fase: i * 1.37, retraso: 0.1 + i * 0.13 };
  });

  // ---------- partículas ----------
  const N = 90;
  const posP = new Float32Array(N * 3), velP = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    posP[i * 3] = -2.6 + Math.random() * 6.4;
    posP[i * 3 + 1] = -3.4 + Math.random() * 6.8;
    posP[i * 3 + 2] = -5 + Math.random() * 7;
    velP[i] = 0.02 + Math.random() * 0.05;
  }
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute("position", new THREE.BufferAttribute(posP, 3));
  const matP = new THREE.PointsMaterial({ map: texPunto, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xaaf2ff });
  const particulas = new THREE.Points(geoP, matP); escena.add(particulas);

  // ---------- disposición según la columna derecha ----------
  let W = 1, H = 1;
  function disponer() {
    const cw = cover.clientWidth, ch = cover.clientHeight;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch; camera.updateProjectionMatrix();
    H = 2 * CAM_Z * Math.tan((camera.fov * Math.PI) / 360); W = H * camera.aspect;
    const cr = cover.getBoundingClientRect(), ar = art.getBoundingClientRect();
    const cx = (ar.left + ar.width / 2 - cr.left) / cw, cy = (ar.top + ar.height / 2 - cr.top) / ch;
    raiz.position.set((cx - 0.5) * W + 0.25, (0.5 - cy) * H, 0);
    const colW = (ar.width / cw) * W;
    raiz.scale.setScalar(Math.max(0.7, Math.min(1.4, colW / 4.2)));
  }
  new ResizeObserver(disponer).observe(cover);
  disponer();

  // ---------- interacción ----------
  let mx = 0, my = 0, sx = 0, sy = 0;
  addEventListener("pointermove", (e) => {
    mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  // ── Clic en una pantalla: abre el visor con su descripción ──
  const rayo = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const pantallas = paneles.map((o) => o.pantalla);
  let sobre = null;
  const tocado = (e) => {
    if (e.target.closest("a, button, input, label, .cover-txt")) return null;
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ptr, camera);
    const h = rayo.intersectObjects(pantallas, false)[0];
    return h ? paneles.find((o) => o.pantalla === h.object) : null;
  };
  cover.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !cover.classList.contains("gl-on")) return;
    sobre = tocado(e);
    cover.classList.toggle("gl-hover", !!sobre);
  }, { passive: true });
  cover.addEventListener("pointerleave", () => { sobre = null; cover.classList.remove("gl-hover"); });
  cover.addEventListener("click", (e) => {
    if (!cover.classList.contains("gl-on")) return;
    const o = tocado(e);
    if (o) dispatchEvent(new CustomEvent("visor:abrir", { detail: { id: o.def.visor, slide: o.def.img } }));
  });

  const ease = (x) => 1 - Math.pow(1 - x, 3);
  let activo = true, visible = true, t0 = performance.now(), ultimo = t0, raf = 0, primero = true;
  const TAU = Math.PI * 2;

  function cuadro(ahora) {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
    sx += (mx - sx) * 0.045; sy += (my - sy) * 0.045;

    const p = scrollP;
    escena.rotation.y = sx * 0.085;
    escena.rotation.x = sy * 0.05 + p * 0.2;
    escena.position.y = p * 1.1;
    camera.position.z = CAM_Z + p * 1.6;

    for (const o of paneles) {
      const k = ease(Math.min(1, Math.max(0, (t - o.retraso) / 1.5)));
      const [bx, by, bz] = o.def.p, prof = 1 + bz * 0.22;
      o.g.position.x = bx + sx * 0.12 * prof;
      o.g.position.y = by - sy * 0.08 * prof + Math.sin((t * TAU) / 12 + o.fase) * 0.07;
      o.g.position.z = bz - (1 - k) * (2.4 + o.fase * 0.4);
      o.g.rotation.x = o.def.r[0] + Math.sin((t * TAU) / 13 + o.fase) * 0.012;
      o.g.rotation.z = o.def.r[2] + Math.sin((t * TAU) / 14 + o.fase) * 0.006;
      o.pantalla.material.opacity = k;
      o.losa.material.opacity = 0.075 * k;
      o.foco = (o.foco || 0) + (((sobre === o) ? 1 : 0) - (o.foco || 0)) * 0.12;
      o.g.scale.setScalar(1 + o.foco * 0.035);
      o.marco.material.opacity = (0.5 + o.foco * 0.5) * k;
      o.halo.material.opacity = (0.55 + o.foco * 0.35) * k;
      o.brillo.material.uniforms.uOp.value = k;
      o.brillo.material.uniforms.uShift.value = 0.55 + sx * 0.3 - sy * 0.15 + o.fase * 0.05;
      if (o.etiqueta) o.etiqueta.material.opacity = k;
    }

    matP.opacity = 0.75 * ease(Math.min(1, t / 2));
    for (let i = 0; i < N; i++) {
      posP[i * 3 + 1] += velP[i] * dt;
      if (posP[i * 3 + 1] > 3.4) posP[i * 3 + 1] = -3.4;
    }
    geoP.attributes.position.needsUpdate = true;

    canvas.style.opacity = String(1 - p * 0.95);
    renderer.render(scene, camera);
    if (primero) { primero = false; cover.classList.add("gl-on"); }
    if (activo) raf = requestAnimationFrame(cuadro);
  }
  const reanudar = () => { if (!raf && visible && !document.hidden && activo) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; reanudar(); }, { threshold: 0.01 }).observe(cover);
  document.addEventListener("visibilitychange", reanudar);
  reduce.addEventListener?.("change", (e) => { if (e.matches) { activo = false; cover.classList.remove("gl-on"); } });
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); activo = false; cover.classList.remove("gl-on"); });
  reanudar();
}

if (puedeWebGL()) {
  const arrancar = () => iniciar().catch((e) => { console.warn("Portada 3D no disponible:", e); cover.classList.remove("gl-on"); });
  const luego = () => ("requestIdleCallback" in window ? requestIdleCallback(arrancar, { timeout: 1200 }) : setTimeout(arrancar, 300));
  if (document.readyState === "complete") luego(); else addEventListener("load", luego, { once: true });
}
