/* ============================================================
   Part 2: three.js viewport, dashboard previews, axes, legend, frame ruler
   Atoms are point-sprite impostor spheres with a key light, a soft rim
   and depth cueing, close to VOLT's canvas look at a fraction of the cost.
   ============================================================ */

const colorProbe = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    return (css) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000'; ctx.fillStyle = css || '#000';
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0] / 255, d[1] / 255, d[2] / 255];
    };
})();
const tokenRGB = (name) => colorProbe(cssVar(name));
const rgbHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

// Structure colors follow OVITO's CNA convention; "Other" is tuned per theme so it never vanishes.
function structureColors() {
    return isDark()
        ? { fcc: '#66d96b', hcp: '#ff6b6b', bcc: '#6f86ff', other: '#e4e4e8' }
        : { fcc: '#52c45a', hcp: '#ec5656', bcc: '#5468ee', other: '#a3a7b3' };
}
const STRUCT_NAMES = ['FCC', 'HCP', 'BCC', 'Other'];
const VIRIDIS = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'].map(hexRGB);
function viridis(t) {
    t = clamp(t, 0, 1) * (VIRIDIS.length - 1);
    const i = Math.min(VIRIDIS.length - 2, Math.floor(t)), f = t - i;
    const a = VIRIDIS[i], b = VIRIDIS[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}
const PE_RANGE = [-3.56, -2.98];
const CU_COLOR = '#c98146';

const ATOM_VS = `
attribute vec3 aColor;
attribute float aRadius;
uniform float uScale;
uniform float uSize;
varying vec3 vColor;
varying float vDepth;
void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_PointSize = max(1.5, aRadius * uSize * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
}`;
const ATOM_FS = `
precision highp float;
varying vec3 vColor;
varying float vDepth;
uniform vec3 uBg;
uniform float uCueNear;
uniform float uCueFar;
uniform float uCue;
void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(p, p);
    if (d2 > 1.0) discard;
    vec3 n = vec3(p.x, -p.y, sqrt(1.0 - d2));
    vec3 L = normalize(vec3(-0.42, 0.62, 0.72));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
    float rim = smoothstep(0.62, 1.0, d2);
    vec3 c = vColor * (0.34 + 0.74 * diff) + vec3(0.2 * spec);
    c *= 1.0 - 0.42 * rim;
    float cue = smoothstep(uCueNear, uCueFar, vDepth) * uCue;
    gl_FragColor = vec4(mix(c, uBg, cue), 1.0);
}`;

function makeAtomMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: ATOM_VS, fragmentShader: ATOM_FS,
        uniforms: {
            uScale: { value: 800 }, uSize: { value: 1 }, uBg: { value: new THREE.Color(1, 1, 1) },
            uCueNear: { value: 0 }, uCueFar: { value: 1 }, uCue: { value: 0.45 },
        },
    });
}

/* ---------------- Main viewport ---------------- */

const VIEW = {
    ok: false, renderer: null, scene: null, camera: null, points: null, geom: null, mat: null, box: null,
    theta: -0.62, phi: 0.2, dist: 600, target: null, frameData: null, dirty: true,
    pos: new Float32Array(NATOMS * 3), cls: new Uint8Array(NATOMS), pe: new Float32Array(NATOMS), shownStep: -1,
};

function initViewport() {
    try {
        const canvas = $('#gl');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 1, 6000);
        camera.up.set(0, 0, 1);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(VIEW.pos, 3));
        geom.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(NATOMS * 3), 3));
        const radii = new Float32Array(NATOMS).fill(1.28);
        geom.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
        const mat = makeAtomMaterial();
        const points = new THREE.Points(geom, mat);
        points.frustumCulled = false;
        scene.add(points);
        const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.55 }));
        scene.add(box);
        Object.assign(VIEW, { ok: true, renderer, scene, camera, geom, mat, points, box });
        bindViewportPointer(canvas);
        const ro = new ResizeObserver(() => { sizeViewport(); });
        ro.observe($('#vp-stage'));
        ro.observe($('#vp-bottom')); // the bar floats over the scene, so its height moves the framing
        sizeViewport();
        applyViewportTheme();
        loopViewport();
    } catch (e) {
        console.warn('WebGL unavailable', e);
        VIEW.ok = false;
        $('#gl').hidden = true;
    }
}

function bottomBarHeight() { const b = $('#vp-bottom'); return b && !b.hidden ? b.offsetHeight : 0; }

function sizeViewport() {
    if (!VIEW.ok) return;
    const el = $('#vp-stage'); // the canvas area between the docked top and bottom bars
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    VIEW.renderer.setSize(w, h, false);
    VIEW.camera.aspect = w / h;
    // The bottom bar floats over the scene: keep the wire centred in the part above it.
    const bh = bottomBarHeight();
    $('#viewport').style.setProperty('--bar-h', `${bh}px`);
    if (bh) VIEW.camera.setViewOffset(w, h, 0, bh / 2, w, h); else VIEW.camera.clearViewOffset();
    VIEW.camera.updateProjectionMatrix();
    const bufH = VIEW.renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    VIEW.mat.uniforms.uScale.value = bufH / Math.tan(THREE.MathUtils.degToRad(VIEW.camera.fov / 2));
    if (VIEW.fitPending) fitView();
    renderNow(); // a resized WebGL canvas is blank until the next draw
    drawRuler();
}

function fitView() {
    if (!VIEW.ok) return;
    const el = $('#vp-stage');
    const h = Math.max(1, el.clientHeight), w = Math.max(1, el.clientWidth);
    const lz = VIEW.frameData ? VIEW.frameData.lz : L0;
    const free = Math.max(0.45, (h - bottomBarHeight() - 48) / h);
    const half = (lz / 2) * 1.04;
    const tan = Math.tan(THREE.MathUtils.degToRad(VIEW.camera.fov / 2));
    const byH = half / (tan * free);
    const byW = (R_WIRE * 2.4) / (tan * (w / h));
    VIEW.dist = Math.max(byH, byW);
    VIEW.theta = -0.62; VIEW.phi = 0.2;
    VIEW.target.set(0, 0, 0);
    VIEW.fitPending = false;
    VIEW.dirty = true;
}

function applyViewportTheme() {
    if (!VIEW.ok) return;
    const bg = tokenRGB('--viewport');
    VIEW.renderer.setClearColor(new THREE.Color(bg[0], bg[1], bg[2]), 1);
    VIEW.mat.uniforms.uBg.value.setRGB(bg[0], bg[1], bg[2]);
    const m = tokenRGB('--muted');
    VIEW.box.material.color.setRGB(m[0], m[1], m[2]);
    VIEW.box.material.opacity = isDark() ? 0.5 : 0.45;
    recolorAtoms();
}

function recolorAtoms() {
    if (!VIEW.ok) return;
    const col = VIEW.geom.getAttribute('aColor');
    const arr = col.array;
    const mode = S.colorMode;
    const sc = structureColors();
    const pal = [hexRGB(sc.fcc), hexRGB(sc.hcp), hexRGB(sc.bcc), hexRGB(sc.other)];
    const cu = hexRGB(CU_COLOR);
    for (let i = 0; i < NATOMS; i++) {
        let c;
        if (mode === 'structure') c = pal[VIEW.cls[i]];
        else if (mode === 'pe') c = viridis((VIEW.pe[i] - PE_RANGE[0]) / (PE_RANGE[1] - PE_RANGE[0]));
        else c = cu;
        arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2];
    }
    col.needsUpdate = true;
    VIEW.dirty = true;
    renderLegend();
}

// Show the dump frame at `step` (a multiple of DUMP_EVERY).
function showFrame(step) {
    VIEW.frameData = computeFrame(step, VIEW);
    VIEW.shownStep = step;
    if (VIEW.ok) {
        VIEW.geom.getAttribute('position').needsUpdate = true;
        let mx = 0, my = 0;
        for (let i = 0; i < NATOMS; i++) { mx = Math.max(mx, Math.abs(VIEW.pos[i * 3])); my = Math.max(my, Math.abs(VIEW.pos[i * 3 + 1])); }
        // boundary s s p: x and y shrink-wrap the atoms, z is the periodic box.
        VIEW.box.scale.set(2 * mx + 1.2, 2 * my + 1.2, VIEW.frameData.lz);
        recolorAtoms();
    }
}

function loopViewport() {
    requestAnimationFrame(loopViewport);
    if (VIEW.dirty) renderNow();
}

function renderNow() {
    if (!VIEW.ok || S.view !== 'workspace') return;
    VIEW.dirty = false;
    const cam = VIEW.camera;
    const cp = Math.cos(VIEW.phi), sp = Math.sin(VIEW.phi);
    cam.position.set(
        VIEW.target.x + VIEW.dist * cp * Math.cos(VIEW.theta),
        VIEW.target.y + VIEW.dist * cp * Math.sin(VIEW.theta),
        VIEW.target.z + VIEW.dist * sp,
    );
    cam.lookAt(VIEW.target);
    cam.updateMatrixWorld();
    const lz = VIEW.frameData ? VIEW.frameData.lz : L0;
    VIEW.mat.uniforms.uCueNear.value = VIEW.dist - lz * 0.25;
    VIEW.mat.uniforms.uCueFar.value = VIEW.dist + lz * 0.6;
    VIEW.mat.uniforms.uCue.value = isDark() ? 0.5 : 0.35;
    VIEW.mat.uniforms.uSize.value = S.atomScale;
    VIEW.box.visible = S.showBox && S.atomsVisible;
    VIEW.points.visible = S.atomsVisible;
    VIEW.renderer.render(VIEW.scene, cam);
    drawAxes();
}

function bindViewportPointer(canvas) {
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey, theta: VIEW.theta, phi: VIEW.phi, t: VIEW.target.clone() };
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (drag.pan) {
            const cam = VIEW.camera;
            const scale = VIEW.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 2 / Math.max(1, canvas.clientHeight);
            const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
            VIEW.target.copy(drag.t).addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
        } else {
            VIEW.theta = drag.theta - dx * 0.008;
            VIEW.phi = clamp(drag.phi + dy * 0.008, -1.45, 1.45);
        }
        VIEW.dirty = true;
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        VIEW.dist = clamp(VIEW.dist * Math.exp(e.deltaY * 0.0012), 60, 4000);
        VIEW.dirty = true;
    }, { passive: false });
    canvas.addEventListener('dblclick', () => { fitView(); });
}

function drawAxes() {
    const svg = $('#vp-axes');
    if (!S.showAxes || !VIEW.ok) { svg.innerHTML = ''; return; }
    const inv = VIEW.camera.matrixWorldInverse;
    const axes = [['x', new THREE.Vector3(1, 0, 0), '--danger'], ['y', new THREE.Vector3(0, 1, 0), '--success'], ['z', new THREE.Vector3(0, 0, 1), '--info']]
        .map(([n, v, c]) => { const d = v.clone().transformDirection(inv); return { n, x: d.x * 19, y: -d.y * 19, z: d.z, c }; })
        .sort((a, b) => a.z - b.z);
    svg.innerHTML = axes.map((a) => `<line x1="0" y1="0" x2="${a.x.toFixed(1)}" y2="${a.y.toFixed(1)}" stroke="var(${a.c})" stroke-width="2" stroke-linecap="round" fill="none"/>`
        + `<text x="${(a.x * 1.3).toFixed(1)}" y="${(a.y * 1.3 + 3.5).toFixed(1)}" text-anchor="middle">${a.n}</text>`).join('')
        + '<circle cx="0" cy="0" r="2" fill="var(--muted)"/>';
}

function renderLegend() {
    const el = $('#vp-legend');
    if (!VIEW.frameData || !S.atomsVisible) { el.hidden = true; return; }
    el.hidden = false;
    if (S.colorMode === 'structure') {
        const sc = structureColors();
        const cols = [sc.fcc, sc.hcp, sc.bcc, sc.other];
        const c = VIEW.frameData.counts;
        el.innerHTML = `<span class="vp-legend__title">Structure</span>` + STRUCT_NAMES.map((n, i) =>
            `<span class="vp-legend__item"><i style="background:${cols[i]}"></i>${n}<b>${(100 * c[i] / NATOMS).toFixed(1)}%</b></span>`).join('');
    } else if (S.colorMode === 'pe') {
        const stops = VIRIDIS.map((c, i) => `${rgbHex(c)} ${(i / (VIRIDIS.length - 1)) * 100}%`).join(',');
        el.innerHTML = `<span class="vp-legend__title">Energy</span><b class="num">${PE_RANGE[0].toFixed(2)}</b><span class="vp-legend__ramp" style="background:linear-gradient(90deg,${stops})"></span><b class="num">${PE_RANGE[1].toFixed(2)} eV</b>`;
    } else {
        el.innerHTML = `<span class="vp-legend__title">Type</span><span class="vp-legend__item"><i style="background:${CU_COLOR}"></i>1 · Cu<b>${fmtInt(NATOMS)}</b></span>`;
    }
}

/* ---------------- Frame ruler ---------------- */

function framesAvailable() {
    if (S.sim !== 'cu') return 0;
    if (['idle', 'building', 'starting'].includes(S.run)) return 0;
    if (S.phase === 'equil') return 0;
    return Math.floor(S.step / DUMP_EVERY) + 1;
}

function drawRuler() {
    const cv = $('#ruler-canvas');
    if (!cv) return;
    const wrap = $('#ruler');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const fg = rgbHex(tokenRGB('--fg')), muted = rgbHex(tokenRGB('--muted'));
    const avail = framesAvailable();
    const pad = 6;
    const X = (f) => pad + (f / (NFRAMES - 1)) * (W - pad * 2);
    const mid = 9;
    // future track
    ctx.strokeStyle = muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(X(Math.max(0, avail - 1)), mid); ctx.lineTo(X(NFRAMES - 1), mid); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // computed frames
    for (let f = 0; f < avail; f++) {
        const major = f % 25 === 0;
        ctx.strokeStyle = major ? fg : muted;
        ctx.globalAlpha = major ? 0.9 : 0.55;
        ctx.beginPath(); ctx.moveTo(X(f) + 0.5, major ? 3 : 6); ctx.lineTo(X(f) + 0.5, major ? 15 : 12); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // labels every 100k steps
    ctx.fillStyle = muted; ctx.font = '10px Geist, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
    for (let s = 0; s <= STEPS_RUN; s += 100000) {
        const f = s / DUMP_EVERY;
        const label = s === 0 ? '0' : `${s / 1000}k`;
        ctx.textAlign = s === 0 ? 'left' : s === STEPS_RUN ? 'right' : 'center';
        ctx.fillText(label, X(f), H - 0.5);
    }
    // yield marker
    if (avail > EPS_Y / ERATE / DUMP_EVERY) {
        const fy = EPS_Y / ERATE / DUMP_EVERY;
        ctx.fillStyle = muted;
        ctx.beginPath(); ctx.moveTo(X(fy) - 3, 0); ctx.lineTo(X(fy) + 3, 0); ctx.lineTo(X(fy), 4); ctx.fill();
    }
    // thumb
    if (avail > 0) {
        const f = clamp(S.frame, 0, avail - 1);
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X(f) - 2, 1, 4, 16, 2) : ctx.rect(X(f) - 2, 1, 4, 16); ctx.fill();
    }
}

/* ---------------- Dashboard previews (rendered once per theme) ---------------- */

const PREVIEW_CACHE = {};
function previewPoints(kind) {
    const sc = structureColors();
    const P = [], C = [], Rr = [];
    const push = (x, y, z, col, r = 1.28) => { P.push(x, y, z); C.push(...hexRGB(col)); Rr.push(r); };
    if (kind === 'cu') {
        const fr = { pos: new Float32Array(NATOMS * 3), cls: new Uint8Array(NATOMS), pe: new Float32Array(NATOMS) };
        computeFrame(184000, fr);
        const cols = [sc.fcc, sc.hcp, sc.bcc, sc.other];
        // wire axis goes along screen x in the card
        for (let i = 0; i < NATOMS; i++) push(fr.pos[i * 3 + 2], fr.pos[i * 3], fr.pos[i * 3 + 1], cols[fr.cls[i]]);
        return { P, C, Rr, half: L0 * 1.184 / 2, view: { theta: 1.32, phi: 0.32 } };
    }
    if (kind === 'al') {
        const a = 4.05, th = Math.atan(1 / 3), B = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
        const hx = 46, hy = 30, hz = 10;
        for (const sgn of [1, -1]) {
            const c = Math.cos(sgn * th), s = Math.sin(sgn * th);
            for (let i = -18; i <= 18; i++) for (let j = -18; j <= 18; j++) for (let k = -3; k <= 3; k++) for (const b of B) {
                const lx = (i + b[0]) * a, ly = (j + b[1]) * a, lz = (k + b[2]) * a;
                const x = c * lx - s * ly, y = s * lx + c * ly, z = lz;
                if (Math.abs(x) > hx || Math.abs(z) > hz || y * sgn < 0 || Math.abs(y) > hy) continue;
                const shear = sgn * 1.2;
                const gb = Math.abs(y) < 2.1;
                const h = hash2(i * 131 + j * 7 + k, sgn + 3);
                push(x + shear, y, z, gb ? sc.other : h < 0.012 ? sc.hcp : sc.fcc, 1.43);
            }
        }
        return { P, C, Rr, half: 64, view: { theta: -1.35, phi: 0.95 } };
    }
    if (kind === 'ni') {
        const a = 3.52, B = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], R = 18;
        for (const cx of [-16.5, 16.5]) {
            for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) for (let k = -7; k <= 7; k++) for (const b of B) {
                const x = (i + b[0]) * a, y = (j + b[1]) * a, z = (k + b[2]) * a;
                const d = Math.hypot(x, y, z);
                if (d > R) continue;
                const X = x + cx;
                if (cx < 0 && X > 0.6) continue;
                if (cx > 0 && X < -0.6) continue;
                const neck = Math.abs(X) < 3.2;
                const h = hash2(i * 97 + j * 13 + k, cx > 0 ? 1 : 2);
                push(X, y, z, d > R - 1.8 ? sc.other : neck ? (h < 0.5 ? sc.hcp : sc.other) : sc.fcc, 1.25);
            }
        }
        return { P, C, Rr, half: 36, view: { theta: 1.05, phi: 0.38 } };
    }
    if (kind === 'lj') {
        const rnd = mulberry32(7);
        const L = 26;
        for (let i = 0; i < 5200; i++) {
            const x = (rnd() - 0.5) * 2 * L * 1.25, y = (rnd() - 0.5) * 2 * L, z = (rnd() - 0.5) * 2 * L;
            const ke = Math.pow(rnd(), 1.6);
            push(x, y, z, rgbHex(viridis(0.15 + 0.8 * ke)), 1.15);
        }
        return { P, C, Rr, half: L * 1.8, view: { theta: -0.75, phi: 0.5 } };
    }
    if (kind === 'fe') {
        const a = 2.855;
        for (let i = -16; i <= 16; i++) for (let j = -10; j <= 10; j++) for (let k = -2; k <= 1; k++) for (const b of [[0, 0, 0], [0.5, 0.5, 0.5]]) {
            const x = (i + b[0]) * a, y = (j + b[1]) * a, z = (k + b[2]) * a;
            const tip = 6;
            const open = x < tip ? (tip - x) * 0.16 + 0.6 : 0;
            if (Math.abs(y) < open) continue;
            const yy = y + Math.sign(y) * open * 0.8;
            const nearCrack = x < tip + 3 && Math.abs(Math.abs(y) - open) < 2.2;
            const h = hash2(i * 53 + j * 11 + k, 4);
            push(x, yy, z, nearCrack ? sc.other : (h < 0.01 ? sc.hcp : sc.bcc), 1.24);
        }
        return { P, C, Rr, half: 60, view: { theta: -1.57, phi: 1.1 } };
    }
    return null;
}

function renderPreviews() {
    if (!window.THREE) return {};
    const W = 720, H = 512;
    let renderer;
    try {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return {}; }
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    const out = {};
    const bg = tokenRGB('--canvas');
    for (const kind of ['cu', 'al', 'ni', 'lj', 'fe']) {
        const d = previewPoints(kind);
        if (!d) continue;
        const scene = new THREE.Scene();
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(d.P, 3));
        geom.setAttribute('aColor', new THREE.Float32BufferAttribute(d.C, 3));
        geom.setAttribute('aRadius', new THREE.Float32BufferAttribute(d.Rr, 1));
        const mat = makeAtomMaterial();
        mat.uniforms.uBg.value.setRGB(bg[0], bg[1], bg[2]);
        mat.uniforms.uCue.value = 0.25;
        const pts = new THREE.Points(geom, mat); pts.frustumCulled = false;
        scene.add(pts);
        const cam = new THREE.PerspectiveCamera(26, W / H, 1, 5000);
        cam.up.set(0, 0, 1);
        const tan = Math.tan(THREE.MathUtils.degToRad(13));
        const dist = (d.half * 1.18) / (tan * (W / H));
        const { theta, phi: ph } = d.view;
        cam.position.set(dist * Math.cos(ph) * Math.cos(theta), dist * Math.cos(ph) * Math.sin(theta), dist * Math.sin(ph));
        cam.lookAt(0, 0, 0);
        cam.setViewOffset(W, H, 0, 46, W, H); // lift the structure above the card caption
        cam.updateProjectionMatrix();
        mat.uniforms.uScale.value = H / tan;
        mat.uniforms.uCueNear.value = dist - d.half * 0.6;
        mat.uniforms.uCueFar.value = dist + d.half * 1.2;
        renderer.render(scene, cam);
        out[kind] = renderer.domElement.toDataURL('image/png');
        geom.dispose(); mat.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss && renderer.forceContextLoss();
    return out;
}
function refreshPreviews() {
    const key = isDark() ? 'dark' : 'light';
    if (!PREVIEW_CACHE[key]) PREVIEW_CACHE[key] = renderPreviews();
    return PREVIEW_CACHE[key];
}
