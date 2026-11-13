// Abertura 3D do Grupo Bridge: ponte pênsil ao entardecer.
// Fonte do arquivo /hero3d.js (gerado com esbuild a partir deste arquivo + three.js).
import * as THREE from 'three';

const NAVY = 0x06101f;
const FOG = 0x0c1a33;
const GOLD = 0xe0b84a;
const GOLD2 = 0xf3d27a;

// medidas da ponte (unidades da cena)
const DECK_Y = 16, HALF_W = 7.5, CABLE_X = 8.6;
const Z_NEAR_ANCHOR = 270, Z_T1 = -80, Z_T2 = -420, Z_FAR_ANCHOR = -660;
const TOP = DECK_Y + 106;
const SUN = new THREE.Vector3(0.42, 0.07, -1).normalize();

function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.75)');
  r.addColorStop(0.45, 'rgba(255,255,255,.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// altura do cabo principal em cada ponto z
function cableY(z) {
  const low = DECK_Y + 7;
  if (z <= Z_T1 && z >= Z_T2) { const mid = (Z_T1 + Z_T2) / 2, half = (Z_T1 - Z_T2) / 2, k = (z - mid) / half; return low + (TOP - low) * k * k; }
  if (z > Z_T1) { const k = Math.min(1, (z - Z_T1) / (Z_NEAR_ANCHOR - Z_T1)); return TOP + (DECK_Y + 2 - TOP) * k - 26 * Math.sin(Math.PI * k) * 0.5; }
  const k = Math.min(1, (Z_T2 - z) / (Z_T2 - Z_FAR_ANCHOR)); return TOP + (DECK_Y + 2 - TOP) * k - 16 * Math.sin(Math.PI * k) * 0.5;
}

function buildBridge(glow) {
  const g = new THREE.Group();
  const anim = { pulses: null, traffic: null, curves: [] };

  // tabuleiro
  const deckLen = Z_NEAR_ANCHOR - Z_FAR_ANCHOR + 120, deckMid = (Z_NEAR_ANCHOR + Z_FAR_ANCHOR) / 2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2, 1.8, deckLen), new THREE.MeshBasicMaterial({ color: 0x0a1528 }));
  deck.position.set(0, DECK_Y - 0.9, deckMid); g.add(deck);
  const girderMat = new THREE.MeshBasicMaterial({ color: 0x08111f });
  for (const x of [-HALF_W + 1.2, HALF_W - 1.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, deckLen), girderMat); b.position.set(x, DECK_Y - 3.2, deckMid); g.add(b); }
  // fio de luz nas bordas do tabuleiro
  const railMat = new THREE.MeshBasicMaterial({ color: 0xf0bd5c });
  for (const x of [-HALF_W, HALF_W]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, deckLen), railMat); r.position.set(x, DECK_Y + 0.5, deckMid); g.add(r); }

  // torres: iluminadas de baixo para cima
  const warm = new THREE.Color(0xd9a04e), dark = new THREE.Color(0x2a2118), under = new THREE.Color(0x0a1220);
  function paint(geo, y0) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + y0;
      if (y < DECK_Y - 1) c.copy(under).lerp(warm, 0.3 + 0.25 * Math.max(0, y / DECK_Y));
      else c.copy(warm).lerp(dark, Math.min(1, Math.pow(Math.max(0, y - DECK_Y) / (TOP - DECK_Y), 0.75)));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const towerMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const z of [Z_T1, Z_T2]) {
    for (const s of [-1, 1]) {
      const h = TOP + 4, geo = new THREE.BoxGeometry(3.4, h, 4.6, 1, 24, 1); paint(geo, h / 2);
      const leg = new THREE.Mesh(geo, towerMat); leg.position.set(s * (CABLE_X + 0.2), h / 2, z); g.add(leg);
    }
    for (const y of [DECK_Y - 5, DECK_Y + 46, TOP - 6]) {
      const geo = new THREE.BoxGeometry(CABLE_X * 2, y > TOP - 10 ? 6 : 3.4, 3.6, 1, 2, 1); paint(geo, y);
      const beam = new THREE.Mesh(geo, towerMat); beam.position.set(0, y, z); g.add(beam);
    }
  }

  // cabos principais
  const cableMat = new THREE.MeshBasicMaterial({ color: GOLD });
  const lineMat = new THREE.LineBasicMaterial({ color: GOLD2, transparent: true, opacity: 0.85 });
  const hangMat = new THREE.LineBasicMaterial({ color: 0xc9a657, transparent: true, opacity: 0.34 });
  const hang = [];
  for (const s of [-1, 1]) {
    const pts = [];
    for (let z = Z_NEAR_ANCHOR; z >= Z_FAR_ANCHOR; z -= 5) pts.push(new THREE.Vector3(s * CABLE_X, cableY(z), z));
    const curve = new THREE.CatmullRomCurve3(pts); anim.curves.push(curve);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.4, 6, false), cableMat));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    for (let z = Z_NEAR_ANCHOR - 10; z > Z_FAR_ANCHOR + 5; z -= 9) {
      const y = cableY(z); if (y < DECK_Y + 2.5) continue;
      hang.push(s * CABLE_X, DECK_Y, z, s * CABLE_X, y, z);
    }
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hang, 3));
  g.add(new THREE.LineSegments(hg, hangMat));

  // luzes do tabuleiro
  const lamps = [];
  for (let z = Z_NEAR_ANCHOR + 40; z > Z_FAR_ANCHOR - 40; z -= 13) for (const s of [-1, 1]) lamps.push(s * HALF_W, DECK_Y + 1.3, z);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
  const lampPts = new THREE.Points(lg, new THREE.PointsMaterial({ map: glow, color: 0xffd58a, size: 6.5, sizeAttenuation: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lampPts.frustumCulled = false; g.add(lampPts);

  // luzes no topo das torres
  const tops = [];
  for (const z of [Z_T1, Z_T2]) for (const s of [-1, 1]) tops.push(s * CABLE_X, TOP + 6, z);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tops, 3));
  g.add(new THREE.Points(tg, new THREE.PointsMaterial({ map: glow, color: 0xffc56a, size: 22, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));

  // pulsos de luz que correm pelos cabos (as "conexões")
  const NP = 7, pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 2 * 3), 3));
  const pulses = new THREE.Points(pg, new THREE.PointsMaterial({ map: glow, color: 0xfff0c2, size: 15, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  pulses.frustumCulled = false; g.add(pulses); anim.pulses = pulses; anim.NP = NP;

  // luzes atravessando a ponte
  const NT = 22, tgeo = new THREE.BufferGeometry();
  tgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NT * 3), 3));
  const traffic = new THREE.Points(tgeo, new THREE.PointsMaterial({ map: glow, color: 0xfff6dc, size: 5, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  traffic.frustumCulled = false; g.add(traffic); anim.traffic = traffic; anim.NT = NT;
  const r = rnd(77); anim.seed = Array.from({ length: NT }, () => [r(), 0.6 + r() * 0.8]);

  return { group: g, anim };
}

// serras ao fundo, em camadas
function ridge({ z, x0, x1, base, amp, seed, color, notchX, notchW, low, rotY, x }) {
  const r = rnd(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28], n = 160, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, px = x0 + (x1 - x0) * u;
    let h = base + amp * (0.5 + 0.5 * Math.sin(u * 5.1 + ph[0])) * (0.55 + 0.45 * Math.sin(u * 11.3 + ph[1])) + amp * 0.16 * Math.sin(u * 31 + ph[2]) + amp * 0.07 * Math.sin(u * 83 + ph[3]);
    if (notchX !== undefined) { const d = (px - notchX) / notchW; h = low + (h - low) * (1 - Math.exp(-d * d)); }
    pos.push(px, 0, 0, px, Math.max(2, h), 0); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  m.position.set(x || 0, 0, z); if (rotY) m.rotation.y = rotY; return m;
}

const SKY_FN = `
vec3 skyColor(vec3 d){
  float h=max(d.y,0.0);
  vec3 c=mix(uHorizon,uZenith,pow(h,0.42));
  float s=max(dot(normalize(d),uSun),0.0);
  c+=uWarm*(pow(s,6.0)*0.17+pow(s,26.0)*0.42)*exp(-h*4.2);
  c+=uGlow*(pow(s,140.0)*0.55+pow(s,1400.0)*1.5);
  c+=uWarm*exp(-h*16.0)*pow(s,3.0)*0.2;
  return c;
}`;

export function start(el) {
  const canvas = el.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  renderer.setClearColor(NAVY, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, 0.00105);
  const camera = new THREE.PerspectiveCamera(46, 1, 1, 9000);
  const glow = glowTexture();

  const U = {
    uTime: { value: 0 }, uSun: { value: SUN },
    uHorizon: { value: new THREE.Color(0x13233f) }, uZenith: { value: new THREE.Color(0x030812) },
    uWarm: { value: new THREE.Color(0xcf7a30) }, uGlow: { value: new THREE.Color(0xffd89a) },
    uDeep: { value: new THREE.Color(0x030a16) }, uFog: { value: new THREE.Color(FOG) }, uFogD: { value: 0.00105 },
  };

  // céu
  const sky = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 16), new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uSun,uHorizon,uZenith,uWarm,uGlow; varying vec3 vDir; ${SKY_FN}
      void main(){ gl_FragColor=vec4(skyColor(normalize(vDir)),1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);

  // estrelas
  { const r = rnd(5), p = []; for (let i = 0; i < 320; i++) { const a = r() * 6.283, y = 0.12 + r() * 0.88, k = Math.sqrt(1 - y * y); p.push(Math.cos(a) * k * 6000, y * 6000, Math.sin(a) * k * 6000); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd9ee, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false, fog: false })); st.renderOrder = -9; sky.add(st); }

  // mundo (o que também aparece refletido na água)
  const world = new THREE.Group();
  const { group: bridge, anim } = buildBridge(glow); world.add(bridge);
  const sunX = (z) => -50 + SUN.x / -SUN.z * (168 - z);
  world.add(ridge({ z: -690, x0: -2600, x1: 2600, base: 16, amp: 70, seed: 11, color: 0x050b17, notchX: 0, notchW: 150, low: 20 }));
  world.add(ridge({ z: -1000, x0: -3400, x1: 3400, base: 50, amp: 150, seed: 23, color: 0x060e1c, notchX: sunX(-1000), notchW: 300, low: 26 }));
  world.add(ridge({ z: -1500, x0: -4600, x1: 4600, base: 90, amp: 230, seed: 37, color: 0x08111f, notchX: sunX(-1500), notchW: 420, low: 40 }));
  world.add(ridge({ z: -2300, x0: -6000, x1: 6000, base: 120, amp: 330, seed: 51, color: 0x0a1424, notchX: sunX(-2300), notchW: 520, low: 60 }));
  world.add(ridge({ z: 0, x: -420, x0: -100, x1: 760, base: 26, amp: 120, seed: 64, color: 0x040914, rotY: Math.PI / 2 }));
  world.add(ridge({ z: 0, x: 520, x0: 60, x1: 760, base: 30, amp: 150, seed: 85, color: 0x040914, rotY: Math.PI / 2 }));
  scene.add(world);

  const mirror = world.clone(true); mirror.scale.y = -1; scene.add(mirror);
  mirror.traverse((o) => { if (o.material && o.material.transparent) o.renderOrder = 1; });
  world.traverse((o) => { if (o.material && o.material.transparent) o.renderOrder = 3; });

  // água
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uFogD; uniform vec3 uSun,uHorizon,uZenith,uWarm,uGlow,uDeep,uFog; varying vec3 vW; ${SKY_FN}
      void main(){
        vec3 toC=cameraPosition-vW; float d=length(toC); vec3 V=toC/d;
        vec2 p=vW.xz; float t=uTime;
        float a=0.16/(1.0+d*0.0035);
        vec2 n=vec2(sin(p.x*0.11+t*0.9)+sin(p.y*0.07-t*0.7)+0.6*sin((p.x+p.y)*0.23+t*1.3)+0.4*sin((p.x-p.y)*0.41-t*1.7),
                    sin(p.y*0.13+t*0.8)+sin(p.x*0.05+t*0.5)+0.6*sin((p.x-p.y)*0.19-t*1.1)+0.4*sin((p.x+p.y)*0.37+t*1.9));
        vec3 N=normalize(vec3(n.x*a,1.0,n.y*a));
        vec3 R=reflect(-V,N); R.y=abs(R.y);
        float fres=pow(1.0-max(dot(V,N),0.0),4.0);
        vec3 col=mix(uDeep,skyColor(R),0.10+0.86*fres);
        float fog=1.0-exp(-pow(d*uFogD,2.0));
        col=mix(col,uFog,fog*0.85);
        gl_FragColor=vec4(col,mix(0.66,0.97,clamp(fres*1.4+fog,0.0,1.0)));
        #include <colorspace_fragment>
      }`,
  }));
  water.rotation.x = -Math.PI / 2; water.renderOrder = 2; scene.add(water);

  // sol baixo no horizonte
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffcf8a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sun.scale.setScalar(760); sun.renderOrder = 0; scene.add(sun);

  // névoa sobre a água
  const mist = []; { const r = rnd(9);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: i % 3 ? 0x7f95c0 : 0xc79a66, transparent: true, opacity: 0.05 + r() * 0.05, depthWrite: false, fog: false }));
      s.position.set(-520 + r() * 1100, 8 + r() * 26, -60 - r() * 760); s.scale.set(420 + r() * 520, 60 + r() * 70, 1); s.renderOrder = 4;
      s.userData = { x: s.position.x, v: 2 + r() * 5, ph: r() * 6.28 }; scene.add(s); mist.push(s);
    } }

  // enquadramento
  const hero = el.parentElement;
  let W = 0, H = 0, portrait = false;
  function resize() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    W = w; H = h; portrait = w / h < 0.85;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = portrait ? 60 : (w / h < 1.3 ? 52 : 46);
    // desloca a imagem: a ponte fica à direita do texto (telas largas) ou abaixo dele (telas em pé)
    if (portrait) camera.setViewOffset(w, h, -w * 0.04, -h * 0.2, w, h); else camera.setViewOffset(w, h, -w * 0.13, -h * 0.02, w, h);
    camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(el); else addEventListener('resize', resize);

  let mx = 0, my = 0, sx = 0, sy = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  let visible = true, running = false, t0 = 0, last = 0, shown = false;
  if (window.IntersectionObserver) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }, { rootMargin: '80px' }).observe(el);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); el.classList.remove('on'); running = false; });
  canvas.addEventListener('webglcontextrestored', () => { kick(); });

  const pos = new THREE.Vector3(), tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    if (!t0) { t0 = now; last = now; }
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    U.uTime.value = t;

    // câmera: entrada suave, leve flutuação, mouse e rolagem
    const rect = hero.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    const k = 1 - ease(Math.min(1, t / 3.2));
    sx += (mx - sx) * Math.min(1, dt * 2.2); sy += (my - sy) * Math.min(1, dt * 2.2);
    pos.set(portrait ? -78 : -50, 19, portrait ? 300 : 168);
    pos.x += -34 * k + Math.sin(t * 0.11) * 3 + sx * 8 + 14 * p;
    pos.y += 30 * k + Math.sin(t * 0.17) * 1.2 - sy * 3.5 + 34 * p;
    pos.z += 150 * k - 170 * p;
    tgt.set(portrait ? 4 : 10, 64 + 8 * k + 16 * p, -260 - 120 * p);
    camera.position.copy(pos); camera.lookAt(tgt);
    sky.position.copy(pos); sun.position.copy(pos).addScaledVector(SUN, 6200);

    // pulsos nos cabos
    const pa = anim.pulses.geometry.attributes.position;
    for (let c = 0; c < 2; c++) for (let i = 0; i < anim.NP; i++) {
      const u = ((i / anim.NP) + t * 0.034 * (c ? 1 : -1) + c * 0.07) % 1;
      anim.curves[c].getPointAt((u + 1) % 1, tmp); pa.setXYZ(c * anim.NP + i, tmp.x, tmp.y + 0.4, tmp.z);
    }
    pa.needsUpdate = true;
    // luzes atravessando
    const ta = anim.traffic.geometry.attributes.position, len = Z_NEAR_ANCHOR - Z_FAR_ANCHOR + 80;
    for (let i = 0; i < anim.NT; i++) {
      const dir = i % 2 ? 1 : -1, s = anim.seed[i];
      const u = ((s[0] + t * 0.022 * s[1] * dir) % 1 + 1) % 1;
      ta.setXYZ(i, dir * 3.2, DECK_Y + 1.1, Z_NEAR_ANCHOR + 40 - u * len);
    }
    ta.needsUpdate = true;
    for (const s of mist) s.position.x = s.userData.x + Math.sin(t * 0.03 * s.userData.v + s.userData.ph) * 60;

    renderer.render(scene, camera);
    if (!shown) { shown = true; requestAnimationFrame(() => el.classList.add('on')); }
    requestAnimationFrame(frame);
  }
  function kick() { if (running || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame((n) => { last = n; if (!t0) t0 = n; frame(n); }); }
  kick();
  // para testes: desenha um quadro num instante escolhido
  el.__h3d = { renderAt(sec) { t0 = performance.now() - sec * 1000; } };
}
