/* LAMMPS Studio mockup · generated from src/*.js by build.sh, edit the sources */
(function () {
'use strict';

/* ---- src/01-core.js ---- */
/* ============================================================
   LAMMPS Studio mockup · part 1: utilities, sample data, physics model
   Everything here is fake but internally consistent: the thermo table,
   the log, the dump frames and the charts all come from one model of a
   <100> Cu nanowire pulled at 1e9 1/s until it necks and breaks.
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtG = (v, p = 8) => (Number.isFinite(v) ? String(Number(v.toPrecision(p))) : 'nan');
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const isDark = () => {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

function hash32(i) {
    let x = (i | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash32(Math.imul(a | 0, 73856093) ^ Math.imul((b | 0) + 1, 19349663));
function gauss2(a, b) {
    const u = Math.max(1e-9, hash2(a, b));
    const v = hash2(a + 7919, b + 104729);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// Abramowitz-Stegun erf, plenty for a displacement profile.
function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
}
const Phi = (s) => 0.5 * (1 + erf(s / Math.SQRT2));
const phi = (s) => Math.exp(-0.5 * s * s) / Math.sqrt(2 * Math.PI);

let toastTimer = 0;
function toast(msg) {
    const root = $('#toast-root');
    root.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { root.innerHTML = ''; }, 2800);
}
function copyText(text, done = 'Copied') {
    try {
        navigator.clipboard.writeText(text).then(() => toast(done), () => toast('Select the text and copy it with Ctrl+C'));
    } catch (e) { toast('Select the text and copy it with Ctrl+C'); }
}

/* ---------------- Sample data ---------------- */

const LAMMPS_VERSION = '22 Jul 2025 · Update 1';

const MACHINES = {
    local: {
        id: 'local', name: 'This computer', kind: 'Local', status: 'ok', icon: 'monitor',
        host: 'rody-workstation', os: 'Ubuntu 24.04', cpu: 'Ryzen 9 7950X · 16 cores', mem: '64 GB',
        runtime: 'Docker 27.3', scheduler: 'None, runs directly', agent: 'lammps-agent 0.1.0',
        root: '~/lammps-studio/simulations', gpus: 0, running: '2 running',
    },
    atlas: {
        id: 'atlas', name: 'atlas', kind: 'Slurm cluster', status: 'ok', icon: 'server',
        host: 'rherrera@atlas', os: 'Rocky Linux 9.4', cpu: '64 nodes · 128 cores each', mem: '512 GB per node',
        runtime: 'Apptainer 1.3', scheduler: 'Slurm 23.11 · cpu, gpu, debug', agent: 'lammps-agent 0.1.0',
        root: '/scratch/rherrera/lammps-studio', gpus: 4, running: '1 running · 1 queued',
    },
    gpu: {
        id: 'gpu', name: 'gpu-box', kind: 'Workstation over SSH', status: 'off', icon: 'cpu',
        host: 'rody@10.0.4.21', os: 'Ubuntu 22.04', cpu: 'Threadripper 7960X · 24 cores', mem: '128 GB',
        runtime: 'Docker 26.1 + NVIDIA toolkit', scheduler: 'None, runs directly', agent: 'lammps-agent 0.1.0',
        root: '~/lammps-studio/simulations', gpus: 2, running: 'Offline since 09:12',
    },
};

const SIMS = [
    { id: 'cu', name: 'Cu nanowire tension', state: 'running', machine: 'local', preview: 'cu', atoms: 17784, step: 184000, total: 500000, folder: 'cu-nanowire-tension' },
    { id: 'al', name: 'Al Σ5 grain boundary shear', state: 'running', machine: 'atlas', preview: 'al', atoms: 256000, step: 1260000, total: 2000000, caption: 'atlas · job 48213 · 4 nodes · ETA 3 h 10 min' },
    { id: 'ni', name: 'Ni nanoparticle sintering', state: 'queued', machine: 'atlas', preview: 'ni', atoms: 4480, caption: 'Queued on atlas · cpu partition · 3rd in line' },
    { id: 'sio2', name: 'SiO₂ melt-quench', state: 'building', machine: 'local', preview: null, atoms: 24000, caption: 'Building LAMMPS with KSPACE, MOLECULE · 41%' },
    { id: 'lj', name: 'LJ melt', state: 'finished', machine: 'local', preview: 'lj', atoms: 32000, caption: 'Finished 2 h ago · 32,000 atoms · 4 min 12 s' },
    { id: 'fe', name: 'Fe crack propagation', state: 'failed', machine: 'gpu', preview: 'fe', atoms: 1152000, caption: 'Failed at step 61,200 · Lost atoms' },
    { id: 'water', name: 'Water box', state: 'draft', machine: 'local', preview: null, atoms: 0, caption: 'Not run yet · no entry script found', folder: 'water-box' },
];

const PACKAGES = [
    { name: 'MANYBODY', group: 'physics', hint: 'eam, tersoff, sw' },
    { name: 'KSPACE', group: 'physics', hint: 'pppm, ewald' },
    { name: 'MOLECULE', group: 'physics', hint: 'bonds, angles' },
    { name: 'RIGID', group: 'physics', hint: 'rigid bodies, shake' },
    { name: 'EXTRA-COMPUTE', group: 'physics', hint: 'extra computes' },
    { name: 'EXTRA-FIX', group: 'physics', hint: 'extra fixes' },
    { name: 'EXTRA-PAIR', group: 'physics', hint: 'extra pair styles' },
    { name: 'REAXFF', group: 'physics', hint: 'reactive force field' },
    { name: 'ML-SNAP', group: 'physics', hint: 'SNAP potentials' },
    { name: 'MC', group: 'physics', hint: 'Monte Carlo' },
    { name: 'VORONOI', group: 'physics', hint: 'needs voro++' },
    { name: 'REPLICA', group: 'physics', hint: 'NEB, PRD' },
    { name: 'OPENMP', group: 'accel', hint: '-sf omp' },
    { name: 'KOKKOS', group: 'accel', hint: '-k on' },
    { name: 'GPU', group: 'accel', hint: '-sf gpu' },
    { name: 'INTEL', group: 'accel', hint: '-sf intel' },
    { name: 'OPT', group: 'accel', hint: '-sf opt' },
];

const BUILDS = [
    { hash: '3f9a0c21b7e4', pkgs: ['MANYBODY', 'OPENMP'], mpi: true, machine: 'local', image: 'lammps/lammps-runtime:3f9a0c21b7e4', size: '1.4 GB', took: '6 min 48 s', used: 2, when: '3 days ago', status: 'ready' },
    { hash: '8d21e6f04a9b', pkgs: ['MANYBODY', 'EXTRA-COMPUTE'], mpi: true, machine: 'atlas', image: 'lammps-8d21e6f04a9b.sif', size: '612 MB', took: '11 min 05 s', used: 2, when: 'last week', status: 'ready' },
    { hash: 'c47b19d2e530', pkgs: ['KSPACE', 'MOLECULE', 'RIGID'], mpi: true, machine: 'local', image: 'lammps/lammps-runtime:c47b19d2e530', size: '—', took: '41%', used: 1, when: 'now', status: 'building' },
    { hash: '1e0f7a3c9d82', pkgs: ['MANYBODY', 'KOKKOS', 'GPU'], mpi: true, machine: 'gpu', image: 'lammps/lammps-runtime:1e0f7a3c9d82', size: '3.1 GB', took: '18 min 40 s', used: 1, when: '2 weeks ago', status: 'ready' },
    { hash: '5b6e2d81f0c4', pkgs: [], mpi: true, machine: 'local', image: 'lammps/lammps-runtime:5b6e2d81f0c4', size: '1.1 GB', took: '5 min 12 s', used: 1, when: 'yesterday', status: 'ready' },
];

/* ---------------- Physics model: <100> Cu nanowire ---------------- */

const A_CU = 3.615;          // lattice constant, Å
const R_WIRE = 21.5;         // radius, Å
const NCELL_Z = 40;          // wire length in unit cells
const L0 = A_CU * NCELL_Z;   // 144.6 Å
const Z_NECK = 0.08 * L0;    // the neck forms a little off-center
const STEPS_EQ = 20000;      // run 1: NVT at 300 K
const STEPS_RUN = 500000;    // run 2: tension
const THERMO_EVERY = 1000;
const DUMP_EVERY = 2000;
const NFRAMES = STEPS_RUN / DUMP_EVERY + 1; // 251
const RESTART_EVERY = 50000;
const ERATE = 1e-6;          // strain per step (0.001 1/ps × 0.001 ps)
const EPS_Y = 0.075, SIG_Y = 4.62, E_MOD = 85;
const KB = 8.617333262e-5;
const TPS = 640.82;          // timesteps per second on 8 MPI × 2 OpenMP

const WIRE = (() => {
    const B = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
    const n = Math.ceil(R_WIRE / A_CU) + 1;
    const xs = [], ys = [], zs = [], pl = [];
    for (let k = 0; k < NCELL_Z; k++) for (let j = -n; j < n; j++) for (let i = -n; i < n; i++) for (const b of B) {
        const x = (i + b[0]) * A_CU, y = (j + b[1]) * A_CU, z = (k + b[2]) * A_CU - L0 / 2;
        if (x * x + y * y > R_WIRE * R_WIRE) continue;
        xs.push(x); ys.push(y); zs.push(z);
        pl.push(Math.round((x + y + z) / A_CU), Math.round((x + y - z) / A_CU), Math.round((x - y + z) / A_CU), Math.round((-x + y + z) / A_CU));
    }
    const N = xs.length;
    const r = new Float32Array(N), surf = new Uint8Array(N), pe0 = new Float32Array(N);
    let peLat = 0;
    for (let i = 0; i < N; i++) {
        r[i] = Math.hypot(xs[i], ys[i]);
        surf[i] = r[i] > R_WIRE - 1.9 ? 1 : 0;
        pe0[i] = surf[i] ? -3.07 + 0.05 * (hash2(i, 1) - 0.5) : -3.54 + 0.012 * (hash2(i, 2) - 0.5);
        peLat += pe0[i];
    }
    // Stacking faults that open after yield: {111} plane pairs crossing the neck.
    const fams = [[1, 1, 1], [1, 1, -1], [1, -1, 1], [-1, 1, 1]];
    const rnd = mulberry32(48213);
    const faults = [];
    for (let f = 0; f < 14; f++) {
        const fam = f % 4;
        const s = fams[fam];
        const dz = (rnd() - 0.5) * 30;
        faults.push({
            fam, n: Math.round((s[2] * (Z_NECK + dz)) / A_CU),
            eps: EPS_Y + 0.0015 + f * 0.009 + rnd() * 0.004,
            heal: EPS_Y + 0.06 + f * 0.016 + rnd() * 0.05,
            zone: 18 + rnd() * 10,
        });
    }
    return { N, x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), pl: Int16Array.from(pl), r, surf, pe0, peLat, faults };
})();
const NATOMS = WIRE.N;

function stressAt(eps, step) {
    let s;
    if (eps <= EPS_Y) {
        const t = eps / EPS_Y;
        s = SIG_Y * t * (1.38 - 0.38 * t);
    } else {
        const d = eps - EPS_Y;
        const thin = smoothstep(0.26, 0.43, eps);
        const flow = 1.28 * (1 - 0.8 * thin);
        s = flow + (SIG_Y - flow) * Math.exp(-d / 0.0045);
        const ph = (d / 0.011) % 1;
        s += 0.34 * (0.5 - ph) * (1 - thin) * smoothstep(0, 0.006, d);
    }
    s *= 1 - smoothstep(0.40, 0.455, eps);
    return s + 0.035 * gauss2(Math.round(step / THERMO_EVERY), 3);
}

// Thermo row for run 2 (tension). Columns match `thermo_style custom step temp pe ke etotal press lz v_strain v_stress`.
function thermoRun(step) {
    const eps = step * ERATE;
    const k = Math.round(step / THERMO_EVERY);
    const sig = step === 0 ? 0.0 : stressAt(eps, step);
    const d = eps - EPS_Y;
    const ph = d > 0 ? (d / 0.011) % 1 : 0;
    const frac = smoothstep(0.40, 0.455, eps);
    let T = 300 + 2.3 * gauss2(k, 5) + 24 * Math.exp(-Math.pow((eps - EPS_Y - 0.0025) / 0.004, 2)) + (d > 0 ? 3.5 * (1 - ph) * (1 - frac) : 0)
        + 30 * Math.exp(-Math.pow((eps - 0.452) / 0.006, 2));
    if (step === 0) T = 300.41;
    const ke = 1.5 * NATOMS * KB * T;
    const V = Math.PI * R_WIRE * R_WIRE * L0;
    const elastic = (V * sig * sig) / (2 * E_MOD) * 0.00624;
    const eps_p = Math.max(0, eps - EPS_Y);
    const pe = WIRE.peLat + 1.5 * NATOMS * KB * 300 + elastic + 290 * eps_p + 140 * frac + 6 * gauss2(k, 7);
    const press = (-sig * 1e4 / 3) * 0.785 + 38 * gauss2(k, 9);
    return { step, temp: T, pe, ke, etotal: pe + ke, press, lz: L0 * (1 + eps), strain: eps, stress: sig };
}

// Thermo row for run 1 (equilibration). `thermo_style custom step temp pe ke etotal press`.
function thermoEq(step) {
    const k = Math.round(step / THERMO_EVERY);
    let T;
    if (step === 0) T = 300;
    else T = 300 - 148 * Math.exp(-(step - 1000) / 1100) + 2.4 * gauss2(k, 11);
    const Tpe = step === 0 ? 0 : 300 * (1 - Math.exp(-step / 260)) + 2 * gauss2(k, 13);
    const ke = 1.5 * NATOMS * KB * T;
    const pe = WIRE.peLat + 1.5 * NATOMS * KB * Tpe;
    const press = 1850 * Math.exp(-step / 1400) - 64 + 42 * gauss2(k, 15);
    return { step, temp: T, pe, ke, etotal: pe + ke, press };
}

const COLS_EQ = ['Step', 'Temp', 'PotEng', 'KinEng', 'TotEng', 'Press'];
const COLS_RUN = ['Step', 'Temp', 'PotEng', 'KinEng', 'TotEng', 'Press', 'Lz', 'v_strain', 'v_stress'];
function fmtThermoHeader(cols) {
    return '   ' + cols[0].padEnd(7) + cols.slice(1).map((c) => c.padStart(9).padEnd(15)).join('');
}
function fmtThermoRow(row, cols) {
    const vals = [row.temp, row.pe, row.ke, row.etotal, row.press];
    if (cols.length > 6) vals.push(row.lz, row.strain, row.stress);
    return String(row.step).padStart(10) + vals.map((v) => ' ' + ((v >= 0 ? ' ' : '') + fmtG(v)).padEnd(14)).join('');
}

/* Per-atom state for one dump frame. Fills pos (xyz), cls (0 FCC, 1 HCP, 2 BCC, 3 Other) and pe. */
function computeFrame(step, out) {
    const N = NATOMS;
    const eps = step * ERATE;
    const sig = step === 0 ? 0 : Math.max(0, stressAt(eps, step));
    const yielded = eps > EPS_Y;
    const ee = yielded ? sig / E_MOD : eps;
    const ep = Math.max(0, eps - ee);
    const w = Math.max(4, 11 - 14 * ep);
    const PL = ep * L0;
    const fr = smoothstep(0.40, 0.455, eps);
    const frame = Math.round(step / DUMP_EVERY);
    const active = WIRE.faults.filter((f) => eps > f.eps && eps < f.heal);
    const pos = out.pos, cls = out.cls, pe = out.pe;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
        const x0 = WIRE.x[i], y0 = WIRE.y[i], z0 = WIRE.z[i], r0 = WIRE.r[i];
        const s = (z0 - Z_NECK) / w;
        const dzn = Math.abs(z0 - Z_NECK);
        let Pz = Phi(s);
        if (fr > 0) Pz = lerp(Pz, s > 0 ? 1 : 0, fr);
        const lam = (1 + ee) + (PL * phi(s)) / w;
        let rf = Math.sqrt((1 + ee) / lam) * (1 - 0.35 * ee);
        if (fr > 0) rf = lerp(rf, Math.min(1, 0.12 + Math.pow(dzn / 16, 0.9)), fr);
        const jx = (hash2(i * 3, frame) - 0.5) * 0.24, jy = (hash2(i * 3 + 1, frame) - 0.5) * 0.24, jz = (hash2(i * 3 + 2, frame) - 0.5) * 0.24;
        pos[i * 3] = x0 * rf + jx;
        pos[i * 3 + 1] = y0 * rf + jy;
        pos[i * 3 + 2] = z0 * (1 + ee) + PL * (Pz - 0.5) + jz;

        // Common neighbour analysis, faked from geometry.
        const g = Math.exp(-0.5 * Math.pow((z0 - Z_NECK) / (1.6 * w), 2));
        const band = 1.9 + (yielded ? 5.5 * ep * g : 0) + 6 * fr * Math.exp(-dzn / 9);
        let c = 0;
        if (r0 > R_WIRE - band) c = 3;
        else {
            for (const f of active) {
                if (dzn > f.zone) continue;
                const pi = WIRE.pl[i * 4 + f.fam];
                if (pi === f.n || pi === f.n + 1) { c = 1; break; }
            }
            if (c === 0 && yielded && ep > 0.09 && dzn < w * 0.8 && hash2(i, 77) < 0.035) c = 2;
            if (c === 0 && hash2(i, frame + 991) < 0.0035) c = 3;
        }
        cls[i] = c;
        counts[c]++;
        let e = WIRE.pe0[i];
        if (c === 1) e += 0.018;
        else if (c === 2) e += 0.05;
        else if (c === 3 && !WIRE.surf[i]) e = -3.24 + 0.08 * (hash2(i, 5) - 0.5);
        pe[i] = e + 0.03 * (hash2(i, frame + 3) - 0.5) + 0.4 * ee * ee;
    }
    return { counts, lz: L0 * (1 + eps), eps };
}

/* ---------------- Input scripts shown in the editor ---------------- */

const CU_SCRIPT = `# Uniaxial tension of a <100> Cu nanowire, 4.3 nm across
# EAM potential: Mishin et al., PRB 63, 224106 (2001)

units           metal
boundary        s s p
atom_style      atomic

variable        T      index 300
variable        erate  index 0.001      # 1/ps, i.e. 1e9 1/s
variable        seed   index 48213
variable        L      equal 40

lattice         fcc 3.615
region          box block -10 10 -10 10 0 \${L}
create_box      1 box
region          wire cylinder z 0 0 5.95 INF INF
create_atoms    1 region wire

pair_style      eam/alloy
pair_coeff      * * potentials/Cu01.eam.alloy Cu

neighbor        2.0 bin
neigh_modify    every 1 delay 0 check yes

compute         pe all pe/atom
compute         cna all cna/atom 3.08

# --- equilibrate at T ----------------------------------------
velocity        all create \${T} \${seed} mom yes rot yes dist gaussian
fix             nvt all nvt temp \${T} \${T} 0.1
thermo          1000
thermo_style    custom step temp pe ke etotal press
run             20000

# --- pull along z --------------------------------------------
reset_timestep  0
variable        tmp    equal lz
variable        L0     equal \${tmp}
variable        strain equal (lz-v_L0)/v_L0
variable        stress equal -pzz/10000      # GPa

fix             pull all deform 1 z erate \${erate} units box remap x
thermo_style    custom step temp pe ke etotal press lz v_strain v_stress

dump            traj all custom 2000 wire.lammpstrj id type x y z c_pe c_cna
restart         50000 restart.*.cu
run             500000

write_data      final.data
`;
const CU_LINES = CU_SCRIPT.replace(/\n$/, '').split('\n');
const CU_RUN1_LINE = CU_LINES.indexOf('run             20000') + 1;
const CU_RUN2_LINE = CU_LINES.indexOf('run             500000') + 1;

const WATER_SCRIPT = `# TIP4P/2005 water, 4096 molecules, NPT at 300 K
# Entry point for this folder. Studio did not pick it up because
# it is not called main.in.

units           real
atom_style      full
boundary        p p p

include         setup.lammps
read_data       tip4p.data

pair_style      lj/cut/tip4p/long 1 2 1 1 0.1546 8.5
kspace_style    pppm/tip4p 1.0e-5
bond_style      zero
angle_style     zero

fix             rigid all shake 1e-4 100 0 b 1 a 1
fix             npt all npt temp 300 300 100 iso 1 1 1000

thermo          500
run             200000
`;
const WATER_LINES = WATER_SCRIPT.replace(/\n$/, '').split('\n');

const LAMMPS_COMMANDS = new Set(('units boundary atom_style variable lattice region create_box create_atoms pair_style pair_coeff neighbor neigh_modify compute velocity fix thermo thermo_style run reset_timestep dump restart write_data include read_data kspace_style bond_style angle_style minimize min_style timestep').split(' '));
const STYLE_ARG = { pair_style: 1, atom_style: 1, units: 1, kspace_style: 1, bond_style: 1, angle_style: 1, fix: 3, compute: 3, dump: 3, region: 2, variable: 2, lattice: 1 };

/* ---- src/02-viewport.js ---- */
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

/* ---- src/03-panels.js ---- */
/* ============================================================
   Part 3: app state + workspace panels
   (editor stand-in for the code-server iframe, output, charts,
   variables, output files, runs, build & run settings)
   ============================================================ */

const S = {
    view: 'simulations', page: 'simulations', simFilter: 'all',
    sim: 'cu', act: 'editor', panelOpen: true,
    run: 'running', phase: 'deform', eqStep: STEPS_EQ, step: 184000, frame: 92, live: true, playing: false,
    buildPct: 0, stopTimer: 0, failedAt: 231400, stoppedAt: 0,
    colorMode: 'structure', showBox: true, showAxes: true, atomScale: 1, atomsVisible: true,
    logFilter: 'all', follow: true, plotMode: 'both', featured: 'stress-strain',
    varTab: 'variables', overrides: { T: '', erate: '', seed: '' },
    filesPath: ['runs', 'run-3'], fileSel: null, machineFilter: null,
    machine: 'local', version: 'stable', packages: new Set(['MANYBODY', 'OPENMP']), accel: 'omp', mpi: 8, omp: 2, gpus: 0,
    slurm: { partition: 'cpu', nodes: 1, time: '04:00:00', account: 'mat-sim' },
    entry: { cu: 'main.in', water: null }, waterPick: 'water.lmp',
    log: [], warnings: 0,
};

const SIM_FOLDER = (id) => `${MACHINES[S.machine].root}/${(SIMS.find((s) => s.id === id) || {}).folder || id}`;

/* ---------------- Panel shell ---------------- */

const PANEL_TITLES = {
    editor: 'Editor', output: 'Output', charts: 'Charts', variables: 'Variables', outputs: 'Files', runs: 'Runs', config: 'Build and run',
};

function setAct(act, { toggle = false } = {}) {
    if (toggle && act === S.act && S.panelOpen) {
        S.panelOpen = false;
    } else {
        S.act = act; S.panelOpen = true;
    }
    $$('.act[data-act]').forEach((b) => b.setAttribute('aria-pressed', String(S.panelOpen && b.dataset.act === S.act)));
    $('#panel').classList.toggle('collapsed', !S.panelOpen);
    $('#resize').hidden = !S.panelOpen;
    $('#btn-full').setAttribute('aria-pressed', String(!S.panelOpen));
    $('#btn-full').dataset.tip = S.panelOpen ? 'Hide panel' : 'Show panel';
    if (S.act === 'output') $('#badge-output').hidden = true;
    renderPanel();
}

function renderPanel() {
    if (!S.panelOpen) return;
    const head = $('#panel-head'), body = $('#panel-body');
    const f = PANELS[S.act];
    const r = f();
    // The editor is VS Code in an iframe and brings its own chrome, so it has no panel head.
    head.hidden = r.head === false;
    head.innerHTML = r.head === false ? '' : `<span class="panel__title">${PANEL_TITLES[S.act]}</span><span class="panel__sub">${r.sub || ''}</span><div class="panel__actions">${r.actions || ''}</div>`;
    body.innerHTML = r.body;
    body.scrollTop = 0;
    r.after && r.after(body);
}

const PANELS = {
    editor: panelEditor, output: panelOutput, charts: panelCharts, variables: panelVariables,
    outputs: panelOutputs, runs: panelRuns, config: panelConfig,
};

/* ---------------- Editor (stand-in for code-server in an iframe) ---------------- */

function tokenizeLine(line) {
    let code = line, comment = '';
    let q = null;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) { if (ch === q) q = null; continue; }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (ch === '#') { code = line.slice(0, i); comment = line.slice(i); break; }
    }
    const parts = code.split(/(\s+)/);
    let word = -1, cmd = null;
    const out = parts.map((p) => {
        if (!p) return '';
        if (/^\s+$/.test(p)) return p;
        word++;
        const e = esc(p);
        if (word === 0) { cmd = p; return LAMMPS_COMMANDS.has(p) ? `<span class="t-cmd">${e}</span>` : e; }
        if (/^\$\{?\w+\}?$|^[vcf]_\w+$/.test(p)) return `<span class="t-var">${e}</span>`;
        if (/\$\{\w+\}|[vcf]_\w+/.test(p)) return e.replace(/(\$\{\w+\}|\b[vcf]_\w+)/g, '<span class="t-var">$1</span>');
        if (/^["'].*["']$/.test(p)) return `<span class="t-str">${e}</span>`;
        if (/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(p)) return `<span class="t-num">${e}</span>`;
        if (STYLE_ARG[cmd] === word) return `<span class="t-style">${e}</span>`;
        return e;
    }).join('');
    return out + (comment ? `<span class="t-com">${esc(comment)}</span>` : '');
}

function runLens(lineNo) {
    if (S.sim !== 'cu') return '';
    const st = S.run;
    if (lineNo === CU_RUN1_LINE) {
        if (['idle', 'building', 'starting'].includes(st)) return `<div class="lens" data-lens="${lineNo}">${icon('play', 'xs')} Run from here · Ctrl+Enter</div>`;
        if (S.phase === 'equil' && st === 'running') return `<div class="lens" data-lens="${lineNo}"><b>●</b> Running · step ${fmtInt(S.eqStep)} of 20,000</div>`;
        return `<div class="lens" data-lens="${lineNo}"><b>✓</b> Completed in 31.2 s · 20,000 steps</div>`;
    }
    if (lineNo === CU_RUN2_LINE) {
        if (['idle', 'building', 'starting'].includes(st) || S.phase === 'equil') return '';
        if (st === 'running') return `<div class="lens" data-lens="${lineNo}"><b>●</b> Running · step ${fmtInt(S.step)} of 500,000 · ${(100 * S.step / STEPS_RUN).toFixed(1)}% · Stop</div>`;
        if (st === 'stopping') return `<div class="lens" data-lens="${lineNo}">Stopping at step ${fmtInt(S.step)}…</div>`;
        if (st === 'cancelled') return `<div class="lens" data-lens="${lineNo}">Stopped at step ${fmtInt(S.step)} · Run again</div>`;
        if (st === 'failed') return `<div class="lens" data-lens="${lineNo}" style="color:var(--danger-ink)">${icon('alert-circle', 'xs')} Failed at step ${fmtInt(S.step)} · Neighbor list overflow · Show in output</div>`;
        if (st === 'finished') return `<div class="lens" data-lens="${lineNo}"><b>✓</b> Completed in 13 min 00 s · 500,000 steps</div>`;
    }
    return '';
}

function treeRow(depth, ic, name, { active = false, tag = '', tagCls = '', chev = null } = {}) {
    const chevron = chev === null ? '<span style="width:14px;flex:none"></span>' : `<svg class="icon xs" style="width:14px;height:14px;opacity:.7"><use href="#i-chev-${chev ? 'down' : 'right'}"/></svg>`;
    return `<div class="tree-row${active ? ' active' : ''}" style="padding-left:${8 + depth * 12}px">${chevron}<svg class="icon xs"><use href="#i-${ic}"/></svg><span style="overflow:hidden;text-overflow:ellipsis">${esc(name)}</span>${tag ? `<span class="tag ${tagCls}">${tag}</span>` : ''}</div>`;
}

function panelEditor() {
    const cu = S.sim === 'cu';
    const lines = cu ? CU_LINES : WATER_LINES;
    const file = cu ? 'main.in' : 'water.lmp';
    const curLine = cu ? (S.run === 'running' ? (S.phase === 'equil' ? CU_RUN1_LINE : CU_RUN2_LINE) : CU_RUN2_LINE) : 1;
    const nRestart = cu ? Math.min(Math.floor(S.step / RESTART_EVERY), 10) : 0;
    const hasRun = cu && !['idle', 'building', 'starting'].includes(S.run);
    let tree = '';
    if (cu) {
        tree += treeRow(0, 'folder', 'potentials', { chev: true }) + treeRow(1, 'file', 'Cu01.eam.alloy');
        tree += treeRow(0, 'folder', 'runs', { chev: true });
        tree += treeRow(1, 'folder', 'run-1', { chev: false }) + treeRow(1, 'folder', 'run-2', { chev: false });
        if (hasRun) {
            tree += treeRow(1, 'folder', 'run-3', { chev: true, tag: S.run === 'running' ? 'live' : '', tagCls: 'run' });
            tree += treeRow(2, 'file', 'log.lammps');
            if (S.phase !== 'equil') tree += treeRow(2, 'file', 'wire.lammpstrj');
            for (let k = 1; k <= nRestart; k++) tree += treeRow(2, 'file', `restart.${k * RESTART_EVERY}.cu`);
        }
        tree += treeRow(0, 'file-code', 'main.in', { active: true, tag: 'entry', tagCls: 'run' }) + treeRow(0, 'file', 'README.md');
    } else {
        tree += treeRow(0, 'file-code', 'water.lmp', { active: true }) + treeRow(0, 'file-code', 'setup.lammps') + treeRow(0, 'file', 'tip4p.data') + treeRow(0, 'file', 'README.md');
    }
    let code = '';
    lines.forEach((ln, i) => {
        const no = i + 1;
        code += runLens(no);
        code += `<div class="ln${no === curLine && cu && S.run === 'running' ? ' cur' : ''}"><span class="ln__no">${no}</span><span class="ln__txt">${tokenizeLine(ln) || ' '}</span></div>`;
    });
    return {
        head: false,
        body: `<div class="code">
            <div class="code__main">
                <div class="code__explorer"><div class="code__explorer-title">${esc((cu ? 'cu-nanowire-tension' : 'water-box').toUpperCase())}</div>${tree}</div>
                <div class="code__editor">
                    <div class="code__tabs"><div class="code__tab active">${icon('file-code', 'xs')}${file}</div><div class="code__tab">${icon('file', 'xs')}README.md</div></div>
                    <div class="code__crumbs">${esc(cu ? 'cu-nanowire-tension' : 'water-box')} ${icon('chev-right', 'xs')} ${file}</div>
                    <div class="code__lines">${code}</div>
                </div>
            </div>
            <div class="code__status"><span>LAMMPS input · ${cu ? '0 problems' : '0 problems'}</span><span>Ln ${curLine}, Col 1</span><span>Spaces: 4</span><span>UTF-8</span><span>LF</span><span>LAMMPS</span></div>
        </div>`,
        after: (b) => {
            if (cu) {
                const cur = b.querySelector('.ln.cur');
                const box = b.querySelector('.code__lines');
                if (cur && box) box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight * 0.55);
            }
        },
    };
}

/* ---------------- Output (log.lammps, live) ---------------- */

function logLineHTML(l, i) {
    return `<div class="log__line ${l.c || ''}"><span class="n">${i + 1}</span><span>${esc(l.t)}</span></div>`;
}
function filteredLog() {
    if (S.logFilter === 'thermo') return S.log.map((l, i) => [l, i]).filter(([l]) => l.c === 'thermo' || l.c === 'head');
    if (S.logFilter === 'warn') return S.log.map((l, i) => [l, i]).filter(([l]) => l.c === 'warn' || l.c === 'error');
    return S.log.map((l, i) => [l, i]);
}

function panelOutput() {
    const nl = S.log.length;
    const sub = nl ? `log.lammps · run 3 · ${fmtInt(nl)} lines · ${S.warnings} warning${S.warnings === 1 ? '' : 's'}${S.run === 'failed' ? ' · 1 error' : ''}` : 'log.lammps · run 3';
    const seg = `<div class="seg sm" id="log-filter">${[['all', 'All'], ['thermo', 'Thermo'], ['warn', 'Warnings']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${S.logFilter === k}">${l}</button>`).join('')}</div>`;
    const actions = `${seg}<button type="button" class="icon-btn sm" id="log-follow" aria-pressed="${S.follow}" data-tip="Follow new lines" aria-label="Follow new lines">${icon('follow', 'sm')}</button>`
        + `<button type="button" class="icon-btn sm" data-tip="Copy log" aria-label="Copy log" data-copy-log>${icon('copy', 'sm')}</button>`
        + `<button type="button" class="icon-btn sm" data-tip="Save log as…" aria-label="Save log" data-toast="Saved log.lammps to Downloads">${icon('download', 'sm')}</button>`;
    let body;
    if (!nl) {
        body = `<div class="log__empty"><div class="empty">${S.run === 'building'
            ? `<div class="empty__icon">${icon('loader', 'spin')}</div><h3>LAMMPS is being built</h3><p>The run log starts here as soon as the build finishes. Build output is on the viewport card.</p>`
            : `<div class="empty__icon">${icon('terminal')}</div><h3>Nothing has run yet</h3><p>Press Run and LAMMPS writes its log here line by line, with warnings and errors highlighted.</p>`}</div></div>`;
    } else {
        const rows = filteredLog();
        body = `<div class="log" id="log">${rows.length ? rows.map(([l, i]) => logLineHTML(l, i)).join('') : '<div class="log__line meta"><span class="n"></span><span>No lines match this filter.</span></div>'}</div>`;
    }
    return {
        sub, actions, body,
        after: (b) => {
            if (S.follow) b.scrollTop = b.scrollHeight;
            if (S.logFilter === 'warn') b.scrollTop = 0;
        },
    };
}

function appendLogLine(l) {
    S.log.push(l);
    if (l.c === 'warn') {
        S.warnings++;
        if (!(S.panelOpen && S.act === 'output')) { const b = $('#badge-output'); b.textContent = String(S.warnings); b.hidden = false; }
    }
    if (S.view === 'workspace' && S.panelOpen && S.act === 'output') {
        const box = $('#log');
        const pass = S.logFilter === 'all' || (S.logFilter === 'thermo' && (l.c === 'thermo' || l.c === 'head')) || (S.logFilter === 'warn' && (l.c === 'warn' || l.c === 'error'));
        if (box && pass) {
            box.insertAdjacentHTML('beforeend', logLineHTML({ ...l, c: (l.c || '') + ' new' }, S.log.length - 1));
            const body = $('#panel-body');
            if (S.follow) body.scrollTop = body.scrollHeight;
        } else if (!box) renderPanel();
        const sub = $('#panel-head .panel__sub');
        if (sub) sub.textContent = `log.lammps · run 3 · ${fmtInt(S.log.length)} lines · ${S.warnings} warning${S.warnings === 1 ? '' : 's'}${S.run === 'failed' ? ' · 1 error' : ''}`;
    }
}

/* ---------------- Charts (thermo columns, live) ---------------- */

const CHART_DEFS = [
    { key: 'temp', name: 'Temperature', unit: 'K', fmt: (v) => v.toFixed(1) },
    { key: 'pe', name: 'Potential energy', unit: 'eV', fmt: (v) => fmtInt(v) },
    { key: 'etotal', name: 'Total energy', unit: 'eV', fmt: (v) => fmtInt(v) },
    { key: 'press', name: 'Pressure', unit: 'bar', fmt: (v) => fmtInt(v) },
    { key: 'lz', name: 'Box length Lz', unit: 'Å', fmt: (v) => v.toFixed(1) },
    { key: 'stress', name: 'Axial stress', unit: 'GPa', fmt: (v) => v.toFixed(2) },
];
const CHART_META = new Map();

function thermoRows() {
    if (S.sim !== 'cu' || ['idle', 'building', 'starting'].includes(S.run) || S.phase === 'equil') return [];
    const rows = [];
    for (let s = 0; s <= S.step; s += THERMO_EVERY) rows.push(thermoRun(s));
    return rows;
}
function smoothSeries(ys, win = 10) {
    const h = Math.floor(win / 2);
    return ys.map((_, i) => {
        let a = 0, n = 0;
        for (let j = Math.max(0, i - h); j <= Math.min(ys.length - 1, i + h); j++) { a += ys[j]; n++; }
        return a / n;
    });
}
function niceTicks(lo, hi, n = 4) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const span = hi - lo;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const t0 = Math.floor(lo / step) * step, t1 = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let t = t0; t <= t1 + step * 0.5; t += step) ticks.push(Number(t.toPrecision(12)));
    return { ticks, lo: t0, hi: t1, step };
}
function axisLabel(v, step) {
    const a = Math.abs(v);
    if (a >= 1e4 && step >= 100) {
        const d = Math.max(0, 3 - Math.floor(Math.log10(step)));
        return (v / 1000).toFixed(d) + 'k';
    }
    const d = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(Math.min(d, 4));
}
function compact(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
    if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    if (a >= 10 || v === 0) return String(Math.round(v * 10) / 10);
    return String(Number(v.toPrecision(2)));
}

function chartSVG(id, xs, ys, o) {
    const W = o.w, H = o.h, m = o.bare ? { l: 2, r: 6, t: 6, b: 4 } : { l: 40, r: 12, t: 10, b: 20 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const [x0, x1] = o.bare && xs.length > 1 ? [xs[0], xs[xs.length - 1]] : o.xDomain; // sparklines fill their tile
    const smooth = smoothSeries(ys);
    const shown = S.plotMode === 'raw' ? ys : smooth;
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (o.yPad !== undefined) { lo -= o.yPad; hi += o.yPad; }
    if (o.yMin !== undefined) lo = Math.min(lo, o.yMin);
    if (o.yFloor !== undefined) lo = Math.max(lo, o.yFloor);
    const T = niceTicks(lo, hi, o.ticks || 4);
    const sx = (x) => m.l + ((x - x0) / (x1 - x0)) * iw;
    const sy = (y) => m.t + ih - ((y - T.lo) / (T.hi - T.lo)) * ih;
    const path = (arr) => arr.map((y, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(y).toFixed(1)}`).join('');
    let g = '';
    if (!o.bare) for (const t of T.ticks) g += `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}"/><text class="axis-text" x="${m.l - 8}" y="${(sy(t) + 3.5).toFixed(1)}" text-anchor="end">${axisLabel(t, T.step)}</text>`;
    const xt = o.bare ? [] : o.xTicks;
    for (const t of xt) g += `<text class="axis-text" x="${sx(t).toFixed(1)}" y="${H - 4}" text-anchor="${t === x0 ? 'start' : t === x1 ? 'end' : 'middle'}">${o.xFmt(t)}</text>`;
    let lines = '';
    if (xs.length > 1) {
        const base = sy(Math.max(T.lo, Math.min(T.hi, o.areaBase !== undefined ? o.areaBase : T.lo)));
        lines += `<path class="area" d="${path(shown)}L${sx(xs[xs.length - 1]).toFixed(1)},${base.toFixed(1)}L${sx(xs[0]).toFixed(1)},${base.toFixed(1)}Z"/>`;
        if (S.plotMode === 'both' && !o.bare) lines += `<path class="line raw" d="${path(ys)}"/>`;
        lines += `<path class="line" d="${path(shown)}"/>`;
        const ex = sx(xs[xs.length - 1]), ey = sy(shown[shown.length - 1]);
        lines += `<circle class="end" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${o.bare ? 3 : 4}"/>`;
    }
    let ann = '';
    for (const a of o.annotations || []) {
        const ax = sx(a.x), ay = sy(a.y);
        const right = ax < W * 0.6;
        ann += `<circle class="annot-dot" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4"/><text class="annot" x="${(ax + (right ? 9 : -9)).toFixed(1)}" y="${(ay + 4).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}">${esc(a.label)}</text>`;
    }
    CHART_META.set(id, { xs, ys, shown, sx, sy, W, H, m, fmtX: o.tipX, fmtY: o.tipY });
    return `<svg class="chart-svg" data-chart="${id}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label)}">${g}${lines}${ann}<line class="cross" data-cross x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><circle class="end" data-hover r="4" visibility="hidden" cx="0" cy="0"/><rect x="${m.l}" y="0" width="${iw}" height="${H}" fill="transparent" data-hit/></svg>`;
}

function bindChartHover(root) {
    root.querySelectorAll('svg[data-chart]').forEach((svg) => {
        const meta = CHART_META.get(svg.dataset.chart);
        if (!meta || meta.xs.length < 2) return;
        const card = svg.closest('.chart-card');
        let tip = null;
        const hide = () => { svg.querySelector('[data-cross]').setAttribute('visibility', 'hidden'); svg.querySelector('[data-hover]').setAttribute('visibility', 'hidden'); if (tip) { tip.remove(); tip = null; } };
        svg.addEventListener('pointermove', (e) => {
            const r = svg.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * meta.W;
            let best = 0, bd = Infinity;
            meta.xs.forEach((x, i) => { const d = Math.abs(meta.sx(x) - px); if (d < bd) { bd = d; best = i; } });
            const x = meta.sx(meta.xs[best]), y = meta.sy(meta.shown[best]);
            const cross = svg.querySelector('[data-cross]'); cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
            const dot = svg.querySelector('[data-hover]'); dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('visibility', 'visible');
            if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip glass'; card.appendChild(tip); }
            tip.innerHTML = `${meta.fmtX(meta.xs[best])}<br><b>${meta.fmtY(meta.ys[best])}</b>${S.plotMode === 'both' ? ` <span class="muted">· smoothed ${meta.fmtY(meta.shown[best])}</span>` : ''}`;
            const cr = card.getBoundingClientRect();
            const left = r.left - cr.left + (x / meta.W) * r.width;
            const top = r.top - cr.top + (y / meta.H) * r.height;
            const tw = tip.offsetWidth;
            tip.style.left = `${clamp(left + 12, 4, cr.width - tw - 4)}px`;
            tip.style.top = `${Math.max(4, top - 46)}px`;
        });
        svg.addEventListener('pointerleave', hide);
    });
}

function chartLast(rows, key) {
    const last = rows[rows.length - 1];
    if (key === 'stress-strain') return { label: 'Stress–strain', value: last.stress.toFixed(2), unit: 'GPa' };
    const d = CHART_DEFS.find((x) => x.key === key);
    return { label: d.name, value: d.fmt(last[d.key]), unit: d.unit };
}
function peakRow(rows) { let bi = 0; rows.forEach((r, i) => { if (r.stress > rows[bi].stress) bi = i; }); return rows[bi]; }
const tileHead = (label, value, unit) => `<div class="tile__head"><span class="tile__label">${label}</span><span class="tile__value num">${value}<small>${unit}</small></span></div>`;

function tileChart(id, key, rows, w, h, big) {
    if (key === 'stress-strain') {
        const xs = rows.map((r) => r.strain), ys = rows.map((r) => r.stress);
        const pk = peakRow(rows);
        const ann = big && S.step > EPS_Y / ERATE + 4000 ? [{ x: pk.strain, y: pk.stress, label: `Yield ${pk.stress.toFixed(2)} GPa` }] : [];
        return chartSVG(id, xs, ys, { w, h, bare: !big, xDomain: [0, 0.5], xTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], xFmt: (t) => t.toFixed(1), yMin: 0, yFloor: 0, yPad: 0.2, areaBase: 0, annotations: ann, tipX: (x) => `ε ${x.toFixed(3)}`, tipY: (y) => `${y.toFixed(2)} GPa`, label: 'Stress against strain' });
    }
    const d = CHART_DEFS.find((x) => x.key === key);
    const xs = rows.map((r) => r.step), ys = rows.map((r) => r[d.key]);
    return chartSVG(id, xs, ys, { w, h, bare: !big, ticks: 4, xDomain: [0, STEPS_RUN], xTicks: [0, 100000, 200000, 300000, 400000, 500000], xFmt: (t) => (t ? t / 1000 + 'k' : '0'), yPad: 0, tipX: (x) => `Step ${fmtInt(x)}`, tipY: (y) => `${d.fmt(y)} ${d.unit}`, label: `${d.name} against step` });
}

function panelCharts() {
    const rows = thermoRows();
    const seg = `<div class="seg sm" id="plot-mode">${[['raw', 'Raw'], ['smooth', 'Smooth'], ['both', 'Both']].map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${S.plotMode === k}">${l}</button>`).join('')}</div>`;
    const actions = `${seg}<button type="button" class="btn secondary sm" id="chart-export">${icon('download', 'xs')}Export</button>`;
    if (!rows.length) {
        const msg = S.sim !== 'cu' ? 'This simulation has not produced thermo output yet.' : S.phase === 'equil' && S.run === 'running' ? 'Equilibration is running. Charts start with the tension run, which defines v_strain and v_stress.' : 'Every column of thermo_style becomes a chart here as soon as LAMMPS prints the first thermo line.';
        return { sub: 'Thermo', actions, body: `<div class="log__empty"><div class="empty" style="margin:0 auto"><div class="empty__icon">${icon('chart')}</div><h3>No thermo data yet</h3><p>${msg}</p></div></div>` };
    }
    return {
        sub: `Thermo · ${fmtInt(rows.length)} rows${S.run === 'running' ? ' · live' : ''}`,
        actions,
        body: `<div class="bento" id="charts"></div>`,
        after: (b) => drawCharts(b, rows),
    };
}

/* Bento grid: the featured chart takes a 2-row block, the rest fill around it. Click a tile to feature it. */
const BENTO_ROW = 148, BENTO_GAP = 12;
function drawCharts(b, rows) {
    const box = b.querySelector('#charts');
    if (!box) return;
    const W = Math.max(260, box.clientWidth - 24);
    const cols = W >= 640 ? 4 : W >= 400 ? 2 : 1;
    const colW = (W - (cols - 1) * BENTO_GAP) / cols;
    const tileW = (span) => colW * span + BENTO_GAP * (span - 1);
    const spans = { 4: [1, 1, 1, 2, 1, 2, 2], 2: [1, 1, 1, 1, 2, 1, 1], 1: [1, 1, 1, 1, 1, 1, 1] }[cols];
    const featSpan = Math.min(3, cols);
    const keys = ['stress-strain', 'temp', 'press', 'pe', 'etotal', 'lz', 'stress'].filter((k) => k !== S.featured);
    keys.splice(2, 0, 'stat');

    const f = chartLast(rows, S.featured);
    const featH = BENTO_ROW * 2 + BENTO_GAP - 28 - 58 - 10;
    let html = `<div class="chart-card tile tile--feat" style="grid-column:span ${featSpan};grid-row:span 2">${tileHead(f.label, f.value, f.unit)}${tileChart('feat', S.featured, rows, tileW(featSpan) - 32, featH, true)}</div>`;
    keys.forEach((k, i) => {
        const span = spans[i];
        const style = span > 1 ? ` style="grid-column:span ${span}"` : '';
        if (k === 'stat') {
            const pk = peakRow(rows);
            const yielded = S.step > EPS_Y / ERATE + 4000;
            html += `<div class="chart-card tile tile--stat"${style}><span class="tile__label">${yielded ? 'Yield strength' : 'Peak stress so far'}</span><span class="tile__value num">${pk.stress.toFixed(2)}<small>GPa</small></span><span class="tile__note">at strain ${pk.strain.toFixed(3)}</span></div>`;
            return;
        }
        const t = chartLast(rows, k);
        html += `<button type="button" class="chart-card tile" data-feature="${k}"${style} aria-label="Show ${esc(t.label)} large">${tileHead(t.label, t.value, t.unit)}${tileChart('m-' + k, k, rows, tileW(span) - 32, BENTO_ROW - 28 - 46 - 10, false)}</button>`;
    });
    box.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    box.innerHTML = html;
    bindChartHover(box);
}

function refreshChartsIfVisible() {
    if (S.view === 'workspace' && S.panelOpen && S.act === 'charts') {
        const b = $('#panel-body');
        const rows = thermoRows();
        if (!b.querySelector('#charts')) { renderPanel(); return; }
        if (b.querySelector('.chart-tip')) return; // don't yank the chart from under the pointer
        drawCharts(b, rows);
        const sub = $('#panel-head .panel__sub');
        if (sub) sub.textContent = `Thermo · ${fmtInt(rows.length)} rows${S.run === 'running' ? ' · live' : ''}`;
    }
}

/* ---------------- Variables, computes, fixes, dumps ---------------- */

function panelVariables() {
    const tabs = [['variables', 'Variables'], ['computes', 'Computes'], ['fixes', 'Fixes'], ['dumps', 'Dumps']];
    const live = S.sim === 'cu' && !['idle', 'building', 'starting'].includes(S.run) && S.phase !== 'equil';
    const tr = live ? thermoRun(S.step) : null;
    let content = '';
    if (S.varTab === 'variables') {
        const vars = [
            ['T', 'index', '300', true], ['erate', 'index', '0.001', true], ['seed', 'index', '48213', true], ['L', 'equal', '40', false],
            ['L0', 'equal', live ? '144.6' : '—', false], ['strain', 'equal', tr ? tr.strain.toFixed(4) : '—', false], ['stress', 'equal', tr ? tr.stress.toFixed(4) : '—', false],
        ];
        content = `<table class="var-table"><thead><tr><th>Name</th><th>Style</th><th style="text-align:right">Current</th><th style="text-align:right">Next run</th></tr></thead><tbody>
        ${vars.map(([n, st, v, editable]) => `<tr><td class="mono">${n}</td><td class="muted">${st}</td><td class="mono num" style="text-align:right">${v}</td><td style="text-align:right">${editable ? `<input class="var-input${S.overrides[n] ? ' over' : ''}" id="var-${n}" data-var="${n}" placeholder="${v}" value="${esc(S.overrides[n])}" aria-label="Override ${n} for the next run">` : '<span class="muted">—</span>'}</td></tr>`).join('')}
        </tbody></table>`;
    } else if (S.varTab === 'computes') {
        const rows = [['pe', 'all', 'pe/atom', 'Per atom · in dump traj'], ['cna', 'all', 'cna/atom 3.08', 'Per atom · in dump traj · colors the viewport'], ['thermo_temp', 'all', 'temp', 'Global · thermo Temp'], ['thermo_press', 'all', 'pressure', 'Global · thermo Press'], ['thermo_pe', 'all', 'pe', 'Global · thermo PotEng']];
        content = `<div class="list">${rows.map(([id, g, st, d]) => `<div class="list-row"><div class="list-row__icon">${icon('braces', 'sm')}</div><div class="list-row__main"><span><span class="mono">${id}</span> <span class="muted">· ${g} · ${st}</span></span><span>${d}</span></div></div>`).join('')}</div>`;
    } else if (S.varTab === 'fixes') {
        const rows = [['nvt', 'all', 'nvt temp 300 300 0.1', 'Line 30 · active in both runs'], ['pull', 'all', 'deform 1 z erate 0.001 units box remap x', 'Line 41 · active in run 2']];
        content = `<div class="list">${rows.map(([id, g, st, d]) => `<div class="list-row"><div class="list-row__icon">${icon('settings', 'sm')}</div><div class="list-row__main"><span><span class="mono">${id}</span> <span class="muted">· ${g}</span></span><span class="mono">${st}</span></div><span class="muted" style="font-size:var(--text-xs)">${d}</span></div>`).join('')}</div>`;
    } else {
        const n = framesAvailable();
        content = `<div class="list"><div class="list-row"><div class="list-row__icon">${icon('film', 'sm')}</div><div class="list-row__main"><span><span class="mono">traj</span> <span class="muted">· custom · every 2,000 steps</span></span><span class="mono">wire.lammpstrj · id type x y z c_pe c_cna</span></div><span class="chip num">${fmtInt(n)} frames</span></div></div>
        <div class="section"><div class="note">${icon('camera')}<div>The viewport reads this dump. Each new frame replaces the picture while Live is on.<small>Any dump in text format works: custom, atom or xyz.</small></div></div></div>`;
    }
    return {
        sub: S.sim === 'cu' ? 'main.in · run 3' : 'water.lmp',
        actions: `<button type="button" class="btn secondary sm" data-toast="Overrides cleared" data-clear-vars>${icon('rotate', 'xs')}Reset</button>`,
        body: `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-vt="${k}" aria-selected="${S.varTab === k}">${l}</button>`).join('')}</div>${content}`,
    };
}

/* ---------------- Files (a Finder-style browser of the simulation folder) ---------------- */

const DISK_FREE = { local: '1.2 TB', atlas: '1.8 TB', gpu: '3.4 TB' };
const runSeconds = (step) => 31 + step / TPS; // run 3 started at 12:18, equilibration took 31 s
function clockAt(sec) {
    const m = 12 * 60 + 18 + Math.floor(sec / 60);
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
function fileSizes() {
    const lines = S.log.length;
    const frames = framesAvailable();
    return {
        log: `${(lines * 0.088).toFixed(1)} KB`,
        dump: frames ? `${(frames * 1.07).toFixed(1)} MB` : '0 B',
        restarts: Math.min(10, Math.floor(S.step / RESTART_EVERY)),
    };
}
function fileTree() {
    const f = (name, kind, size, mod, ic, open) => ({ name, kind, size, mod, ic, open });
    if (S.sim !== 'cu') {
        return { name: 'water-box', dir: true, children: [
            f('water.lmp', 'LAMMPS input', '0.6 KB', 'Today at 09:40', 'file-code', 'editor'),
            f('setup.lammps', 'LAMMPS input', '0.3 KB', 'Today at 09:40', 'file-code', 'editor'),
            f('tip4p.data', 'Data file', '1.1 MB', 'Yesterday at 18:05', 'file', 'editor'),
            f('README.md', 'Markdown', '0.4 KB', 'Yesterday at 18:05', 'file', 'editor'),
        ] };
    }
    const started = !['idle', 'building', 'starting'].includes(S.run);
    const fz = fileSizes();
    const now = `Today at ${clockAt(runSeconds(S.phase === 'equil' ? 0 : S.step))}`;
    const run3 = [f('log.lammps', 'LAMMPS log', fz.log, now, 'terminal', 'output')];
    if (S.phase !== 'equil') run3.push(f('wire.lammpstrj', 'Dump, text', fz.dump, now, 'film', 'dump'));
    for (let k = 1; k <= fz.restarts; k++) run3.push(f(`restart.${k * RESTART_EVERY}.cu`, 'Restart, binary', '1.7 MB', `Today at ${clockAt(runSeconds(k * RESTART_EVERY))}`, 'disk', 'restart'));
    if (S.run === 'finished') run3.push(f('final.data', 'Data file', '1.2 MB', now, 'file', 'editor'));
    const runs = [
        { name: 'run-1', dir: true, mod: 'Today at 11:02', children: [f('log.lammps', 'LAMMPS log', '2.1 KB', 'Today at 11:02', 'terminal', 'old')] },
        { name: 'run-2', dir: true, mod: 'Today at 11:42', children: [
            f('log.lammps', 'LAMMPS log', '9.4 KB', 'Today at 11:42', 'terminal', 'old'),
            f('wire.lammpstrj', 'Dump, text', '51.4 MB', 'Today at 11:42', 'film', 'old'),
            f('restart.50000.cu', 'Restart, binary', '1.7 MB', 'Today at 11:37', 'disk', 'restart'),
        ] },
    ];
    if (started) runs.push({ name: 'run-3', dir: true, mod: now, children: run3 });
    return { name: 'cu-nanowire-tension', dir: true, children: [
        { name: 'potentials', dir: true, mod: 'Nov 2 at 16:20', children: [f('Cu01.eam.alloy', 'EAM potential', '1.6 MB', 'Nov 2 at 16:20', 'file', 'editor')] },
        { name: 'runs', dir: true, mod: started ? now : 'Today at 11:42', children: runs },
        f('main.in', 'LAMMPS input', '1.9 KB', 'Today at 12:17', 'file-code', 'editor'),
        f('README.md', 'Markdown', '0.6 KB', 'Nov 2 at 16:20', 'file', 'editor'),
    ] };
}
/* Walks S.filesPath as far as it exists, so run-3 shows up again once the run starts. */
function fileDir() {
    const root = fileTree();
    let node = root;
    const path = [];
    for (const seg of S.filesPath) {
        const next = (node.children || []).find((c) => c.dir && c.name === seg);
        if (!next) break;
        node = next; path.push(seg);
    }
    const items = [...node.children].sort((a, b) => (b.dir === true) - (a.dir === true) || a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
    return { root, node, path, items };
}
function filePath(name) {
    const { root, path } = fileDir();
    return `${MACHINES[S.machine].root}/${[root.name, ...path, name].join('/')}`;
}
function openFile(name) {
    const { path, items } = fileDir();
    const it = items.find((x) => x.name === name);
    if (!it) return;
    if (it.dir) { S.filesPath = [...path, it.name]; S.fileSel = null; renderPanel(); return; }
    if (it.open === 'output') setAct('output');
    else if (it.open === 'editor') { setAct('editor'); if (it.name !== 'main.in') toast(`Mockup: VS Code opens ${it.name} in a new tab`); }
    else if (it.open === 'dump') toast(`The viewport is reading ${it.name} · frame ${S.frame + 1} of ${framesAvailable()}`);
    else if (it.open === 'restart') toast(`Mockup: shows what ${it.name} holds (info system, write_data)`);
    else toast(`Mockup: opens ${path.join('/')}/${it.name} from an earlier run`);
}
function fileMenu(name, at) {
    const { items } = fileDir();
    const it = items.find((x) => x.name === name);
    if (!it) return;
    const menu = [{ id: 'open', label: 'Open', run: () => openFile(name) }];
    if (it.open === 'dump' || (it.name.endsWith('.lammpstrj'))) menu.push({ id: 'volt', label: 'Open in VOLT', run: () => toast(`Opens ${it.name} in VOLT for analysis`) });
    if (it.open === 'output') menu.push({ id: 'out', label: 'Show in Output', run: () => setAct('output') });
    menu.push('-',
        { id: 'copy', label: 'Copy path', run: () => copyText(filePath(name), 'Copied the path') },
        { id: 'dl', label: it.dir ? 'Download as zip' : 'Download', run: () => toast(`Downloading ${it.name}${it.dir ? '.zip' : ''}`) },
        '-',
        { id: 'trash', label: 'Move to Trash', danger: true, run: () => toast(`Mockup: asks before deleting ${it.name}`) });
    openMenu({ getBoundingClientRect: () => ({ left: at.x, right: at.x, top: at.y - 6, bottom: at.y - 6 }) }, menu, { width: 210, align: 'left' });
}
function selectFile(name, { focus = true } = {}) {
    S.fileSel = name;
    $$('[data-frow]').forEach((r) => r.setAttribute('aria-selected', String(r.dataset.frow === name)));
    const row = $(`[data-frow="${CSS.escape(name)}"]`);
    if (row && focus) { row.focus({ preventScroll: true }); row.scrollIntoView({ block: 'nearest' }); }
}

function panelOutputs() {
    const { root, path, items } = fileDir();
    const segs = [root.name, ...path];
    const crumbs = segs.map((seg, i) => (i === segs.length - 1
        ? `<span class="crumb" aria-current="location">${esc(seg)}</span>`
        : `<button type="button" class="crumb" data-crumb="${i}">${esc(seg)}</button>`)).join(icon('chev-right', 'xs'));
    const count = (n) => `${n} item${n === 1 ? '' : 's'}`;
    const rows = items.map((it) => `<div class="frow" role="row" tabindex="-1" data-frow="${esc(it.name)}" aria-selected="${S.fileSel === it.name}">
            <span class="frow__name" role="gridcell">${icon(it.dir ? 'folder' : it.ic, 'sm')}<span>${esc(it.name)}</span></span>
            <span class="frow__size" role="gridcell">${it.dir ? count(it.children.length) : it.size}</span>
            <span class="frow__mod" role="gridcell">${it.mod}</span>
            <span class="frow__kind" role="gridcell">${it.dir ? 'Folder' : it.kind}</span>
        </div>`).join('');
    return {
        sub: `<nav class="crumbs" aria-label="Folder">${crumbs}</nav>`,
        actions: `<button type="button" class="icon-btn sm" data-tip="Download folder" aria-label="Download folder" data-toast="Downloading ${esc(segs[segs.length - 1])}.zip">${icon('download', 'sm')}</button>`,
        body: `<div class="finder" role="grid" aria-label="Files in ${esc(segs[segs.length - 1])}">
            <div class="finder__head" role="row"><span>Name</span><span>Size</span><span class="frow__mod">Date modified</span><span class="frow__kind">Kind</span></div>
            <div class="finder__list">${rows || '<div class="finder__empty">This folder is empty</div>'}</div>
            <div class="finder__foot">${count(items.length)} · ${DISK_FREE[S.machine]} available on ${esc(MACHINES[S.machine].name)}</div>
        </div>`,
    };
}

/* ---------------- Runs ---------------- */

function ring(p) {
    const r = 6, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="${r}"/><circle class="ring__v" cx="8" cy="8" r="${r}" stroke-dasharray="${(c * p).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)"/></svg>`;
}
function panelRuns() {
    const cu = S.sim === 'cu';
    if (!cu) return { sub: 'water-box', body: `<div class="log__empty"><div class="empty" style="margin:0 auto"><div class="empty__icon">${icon('history')}</div><h3>No runs yet</h3><p>Every run shows up here with its settings and its own output folder.</p></div></div>` };
    const cfg = `${S.mpi} MPI × ${S.omp} OpenMP`;
    const pct = S.phase === 'equil' ? 0 : S.step / STEPS_RUN;
    const r3 = {
        idle: ['Ready to start', 'Not started'],
        building: [`Waiting for the build · ${Math.round(S.buildPct * 100)}%`, 'Building'],
        starting: ['Starting the container', 'Starting'],
        running: [S.phase === 'equil' ? `Equilibrating · step ${fmtInt(S.eqStep)} of 20,000` : `Step ${fmtInt(S.step)} of 500,000`, null],
        stopping: [`Stopping at step ${fmtInt(S.step)}`, 'Stopping'],
        cancelled: [`Stopped at step ${fmtInt(S.step)}`, 'Stopped'],
        finished: ['500,000 steps in 13 min', 'Completed'],
        failed: [`Neighbor list overflow at step ${fmtInt(S.step)}`, '<span class="danger-ink">Failed</span>'],
    }[S.run] || ['', ''];
    const rows = [
        { n: 3, folder: 'run-3', sub: `${r3[0]} · ${cfg}`, status: r3[1] === null ? `${ring(pct)}<span class="num">${Math.round(pct * 100)}%</span>` : r3[1] },
        { n: 2, folder: 'run-2', sub: 'Stopped at step 96,000 · 8 MPI × 2 OpenMP', status: 'Stopped' },
        { n: 1, folder: 'run-1', sub: 'pair_style eam/alloy needs MANYBODY, added for run 2', status: '<span class="danger-ink">Failed</span>' },
    ];
    return {
        sub: '3 runs',
        body: `<div class="pane"><section class="gsec"><h3 class="group-title">Today</h3><div class="group">${rows.map((r) => `<button type="button" class="grow" data-run-folder="${r.folder}" ${r.n === 3 && ['idle', 'building', 'starting'].includes(S.run) ? 'disabled' : ''}>
            <span class="grow__main"><span class="grow__title">Run ${r.n}</span><span class="grow__sub">${r.sub}</span></span>
            <span class="grow__value">${r.status}</span><span class="grow__chev">${icon('chev-right', 'sm')}</span></button>`).join('')}</div></section></div>`,
    };
}

/* ---------------- Build and run settings (grouped, System Settings style) ---------------- */

const KNOWN_BUILDS = { 'local|MANYBODY,OPENMP': '3f9a0c21b7e4', 'atlas|EXTRA-COMPUTE,MANYBODY': '8d21e6f04a9b', 'local|': '5b6e2d81f0c4', 'gpu|GPU,KOKKOS,MANYBODY': '1e0f7a3c9d82' };
function buildHashFor(machine, pkgs) { return KNOWN_BUILDS[`${machine}|${[...pkgs].sort().join(',')}`] || null; }
function pseudoHash(str) { let h = ''; for (let i = 0; i < 12; i++) h += Math.floor(hash2(str.length * 31 + i, [...str].reduce((a, c) => a * 33 + c.charCodeAt(0), 7) | 0) * 16).toString(16); return h; }

const ACCELS = [['none', 'None', null], ['omp', 'OpenMP', 'OPENMP'], ['kokkos', 'Kokkos', 'KOKKOS'], ['gpu', 'GPU', 'GPU'], ['intel', 'Intel', 'INTEL'], ['opt', 'Opt', 'OPT']];
const VERSIONS = [['stable', `stable · ${LAMMPS_VERSION}`], ['29Aug2024', 'stable · 29 Aug 2024'], ['develop', 'develop']];
const STEP_LIMITS = { mpi: [1, 64], omp: [1, 16], gpus: [0, 8], nodes: [1, 64] };
const physicsPkgs = () => [...S.packages].filter((p) => (PACKAGES.find((x) => x.name === p) || {}).group === 'physics');
function setAccel(k) {
    S.accel = k;
    ACCELS.forEach(([, , pkg]) => pkg && S.packages.delete(pkg));
    const pkg = ACCELS.find(([a]) => a === k)[2];
    if (pkg) S.packages.add(pkg);
}

function runCommand() {
    const ov = Object.entries(S.overrides).filter(([, v]) => v !== '').map(([k, v]) => ` -var ${k} ${v}`).join('');
    const sf = { omp: ` -sf omp -pk omp ${S.omp}`, kokkos: ` -k on t ${S.omp} -sf kk`, gpu: ` -sf gpu -pk gpu ${S.gpus || 1}`, intel: ' -sf intel', opt: ' -sf opt', none: '' }[S.accel];
    const entry = S.sim === 'cu' ? 'main.in' : (S.entry.water || 'water.lmp');
    const env = S.accel === 'omp' || S.accel === 'kokkos' ? `OMP_NUM_THREADS=${S.omp} ` : '';
    if (S.machine === 'atlas') {
        return `sbatch -p ${S.slurm.partition} -N ${S.slurm.nodes} -t ${S.slurm.time} -A ${S.slurm.account}\n  srun apptainer exec lammps-${buildHashFor('atlas', [...S.packages]) || 'new'}.sif \\\n  lmp -in ${entry}${sf}${ov}`;
    }
    return `${env}mpirun -np ${S.mpi} lmp -in ${entry}${sf}${ov}`;
}

const gRow = (label, control, cls = '') => `<div class="grow${cls ? ' ' + cls : ''}"><span class="grow__title">${label}</span><span class="grow__ctl">${control}</span></div>`;
const popup = (key, text, label) => `<button type="button" class="popup" data-pop="${key}" aria-haspopup="menu" aria-label="${esc(label)}: ${esc(text)}"><span>${esc(text)}</span>${icon('chevrons', 'xs')}</button>`;
function stepper(key, v, label) {
    const [lo, hi] = key === 'gpus' ? [0, MACHINES[S.machine].gpus] : STEP_LIMITS[key];
    return `<span class="stepper"><span class="stepper__v num">${v}</span><span class="stepper__btns">`
        + `<button type="button" data-step="${key}" data-d="-1" aria-label="Fewer ${esc(label)}" ${v <= lo ? 'disabled' : ''}>${icon('minus', 'xs')}</button>`
        + `<button type="button" data-step="${key}" data-d="1" aria-label="More ${esc(label)}" ${v >= hi ? 'disabled' : ''}>${icon('plus', 'xs')}</button></span></span>`;
}
const gSection = (title, rows, foot = '') => `<section class="gsec">${title ? `<h3 class="group-title">${title}</h3>` : ''}<div class="group">${rows.join('')}</div>${foot ? `<p class="group-foot">${foot}</p>` : ''}</section>`;

function panelConfig() {
    const m = MACHINES[S.machine];
    const hash = buildHashFor(S.machine, [...S.packages]);
    const phys = physicsPkgs();
    const accel = ACCELS.find(([k]) => k === S.accel);
    const version = VERSIONS.find(([k]) => k === S.version) || VERSIONS[0];
    const entry = S.sim === 'cu' ? 'main.in' : (S.entry.water || 'Choose a file');
    const sched = m.scheduler.startsWith('None') ? 'no scheduler, runs directly' : m.scheduler.split(' · ')[0];
    const build = hash
        ? `<span class="mono muted">${hash}</span><span>Ready</span>`
        : `<span class="warn-ink">Compiles first · about ${S.machine === 'atlas' ? 11 : 7} min</span>`;
    const sections = [
        gSection('Machine', [
            gRow('Run on', popup('machine', m.name, 'Run on')),
            gRow('Folder', `<span class="mono muted grow__path" title="${esc(SIM_FOLDER(S.sim))}">${esc(SIM_FOLDER(S.sim))}</span>`),
        ], `${esc(m.runtime)} · ${esc(sched)}`),
    ];
    if (S.machine === 'atlas') {
        sections.push(gSection('Slurm job', [
            gRow('Partition', popup('partition', S.slurm.partition, 'Partition')),
            gRow('Nodes', stepper('nodes', S.slurm.nodes, 'nodes')),
            gRow('<label for="sl-time">Time limit</label>', `<input class="ginput mono" id="sl-time" data-slurm="time" value="${esc(S.slurm.time)}" spellcheck="false">`),
            gRow('<label for="sl-acct">Account</label>', `<input class="ginput mono" id="sl-acct" data-slurm="account" value="${esc(S.slurm.account)}" spellcheck="false">`),
        ]));
    }
    sections.push(
        gSection('LAMMPS', [
            gRow('Version', popup('version', version[1], 'Version')),
            gRow('Packages', popup('packages', phys.length ? phys.join(', ') : 'Core only', 'Packages')),
            gRow('Build', build),
        ], hash ? 'Studio reuses this build for every simulation with the same packages.' : `Studio builds LAMMPS on ${esc(m.name)} once and reuses it after that.`),
        gSection('Parallel', [
            gRow('Acceleration', popup('accel', accel[1], 'Acceleration')),
            gRow('MPI ranks', stepper('mpi', S.mpi, 'MPI ranks')),
            gRow('Threads per rank', stepper('omp', S.omp, 'threads per rank')),
            ...(m.gpus ? [gRow('GPUs', stepper('gpus', S.gpus, 'GPUs'))] : []),
        ]),
        gSection('Script', [
            gRow('Entry script', popup('entry', entry, 'Entry script')),
            `<div class="grow grow--cmd"><code class="grow__cmd" id="cfg-cmd">${esc(runCommand())}</code><button type="button" class="icon-btn sm" data-copy-cmd data-tip="Copy command" aria-label="Copy command">${icon('copy', 'sm')}</button></div>`,
        ]),
    );
    return {
        sub: 'Applies to the next run',
        body: `<div class="pane">${sections.join('')}</div>`,
    };
}

/* Popup menus for the settings rows. Packages is multi-select, so it reopens after each pick. */
function openSettingPop(key, anchor) {
    const keep = () => { const sc = $('#panel-body').scrollTop; renderPanel(); $('#panel-body').scrollTop = sc; updateRunChrome(); };
    let items = [], width = 230;
    if (key === 'machine') {
        items = Object.values(MACHINES).map((mm) => ({ id: mm.id, label: mm.name, hint: mm.status === 'off' ? 'Offline' : mm.kind, checked: S.machine === mm.id, disabled: mm.status === 'off', run: () => { S.machine = mm.id; S.gpus = Math.min(S.gpus, mm.gpus); renderWorkspace(); } }));
    } else if (key === 'version') {
        items = VERSIONS.map(([k, l]) => ({ id: k, label: l, checked: S.version === k, run: () => { S.version = k; keep(); } }));
    } else if (key === 'accel') {
        items = ACCELS.map(([k, l, pkg]) => ({ id: k, label: l, hint: pkg ? `${pkg} package` : '', checked: S.accel === k, run: () => { setAccel(k); keep(); } }));
    } else if (key === 'partition') {
        items = ['cpu', 'gpu', 'debug'].map((p) => ({ id: p, label: p, checked: S.slurm.partition === p, run: () => { S.slurm.partition = p; keep(); } }));
    } else if (key === 'entry') {
        const files = S.sim === 'cu' ? ['main.in'] : WATER_FILES.filter(([n]) => /\.(lmp|lammps|in)$/.test(n)).map(([n]) => n);
        items = files.map((n) => ({ id: n, label: n, checked: (S.sim === 'cu' ? 'main.in' : S.entry.water) === n, run: () => { if (S.sim !== 'cu') { S.entry.water = n; if (S.run === 'noscript') S.run = 'idle'; renderWorkspace(); } } }));
        items.push('-', { id: 'other', label: 'Choose another file…', run: () => toast('Mockup: pick any file inside the simulation folder') });
    } else if (key === 'packages') {
        width = 300;
        items = PACKAGES.filter((p) => p.group === 'physics').map((p) => {
            const req = p.name === 'MANYBODY' && S.sim === 'cu';
            return { id: p.name, label: p.name, hint: req ? 'main.in needs it' : p.hint, checked: S.packages.has(p.name), disabled: req, run: () => {
                if (S.packages.has(p.name)) S.packages.delete(p.name); else S.packages.add(p.name);
                keep();
                const a = $('[data-pop="packages"]'); if (a) openSettingPop('packages', a);
            } };
        });
    } else if (key === 'machinefilter') {
        width = 270;
        items = [{ id: 'all', label: 'All machines', checked: !S.machineFilter, run: () => setMachine(null) },
            ...Object.values(MACHINES).map((mm) => ({ id: mm.id, label: mm.name, hint: machineStatus(mm), checked: S.machineFilter === mm.id, run: () => setMachine(mm.id) })),
            '-',
            { id: 'connect', label: 'Connect a cluster…', run: () => openConnect(0) },
            { id: 'manage', label: 'Manage machines…', run: () => openSettings('machines') }];
    } else if (key === 'theme') {
        items = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => ({ id: k, label: l, checked: (S.themeOpt || 'system') === k, run: () => { setTheme(k); renderSettings(); } }));
    } else if (key === 'editor') {
        items = [['studio', 'VS Code in Studio'], ['external', 'External editor']].map(([k, l]) => ({ id: k, label: l, checked: SETTINGS.editor === k, run: () => { SETTINGS.editor = k; renderSettings(); } }));
    }
    openMenu(anchor, items, { width, align: 'right', key });
}

/* ---- src/04-dashboard.js ---- */
/* ============================================================
   Part 4: dashboard pages, menus and modals
   ============================================================ */

function cuDashState() {
    if (S.sim !== 'cu') return S.cuLast || 'running';
    return { idle: 'draft', building: 'building', starting: 'running', running: 'running', stopping: 'stopping', cancelled: 'stopped', finished: 'finished', failed: 'failed' }[S.run] || 'running';
}
function etaText(step) {
    const sec = (STEPS_RUN - step) / TPS;
    if (sec < 60) return `ETA ${Math.max(1, Math.round(sec))} s`;
    return `ETA ${Math.round(sec / 60)} min`;
}

function simState(s) { return s.id === 'cu' ? cuDashState() : s.state; }
const FILTERS = [
    ['all', 'All', () => true],
    ['running', 'Running', (st) => ['running', 'building', 'stopping'].includes(st)],
    ['queued', 'Queued', (st) => st === 'queued'],
    ['finished', 'Finished', (st) => st === 'finished' || st === 'stopped'],
    ['failed', 'Failed', (st) => st === 'failed'],
    ['draft', 'Drafts', (st) => st === 'draft'],
];

function simProgress(s) {
    if (s.id === 'cu') {
        if (S.sim !== 'cu') return 184000 / STEPS_RUN;
        if (S.run === 'building') return S.buildPct;
        if (['running', 'stopping', 'cancelled', 'failed', 'finished'].includes(S.run)) return S.phase === 'equil' ? 0 : S.step / STEPS_RUN;
        return null;
    }
    if (s.state === 'running') return s.step / s.total;
    if (s.state === 'building') return 0.41;
    return null;
}

/* Card status: a state word plus details. Three mockup variants, picked from the mockbar:
   text (state word leads the caption), image (also greys out what isn't running), sections (grid grouped by state). */
S.cardStyle = 'image';
const CARD_STATUS = {
    al: { word: 'Running', detail: '63% · ETA 3 h 10 min · atlas' },
    ni: { word: 'Queued', detail: '3rd in line · atlas' },
    sio2: { word: 'Building', detail: 'KSPACE, MOLECULE · 41% · This computer' },
    lj: { word: 'Finished', detail: '2 h ago · 4 min 12 s' },
    fe: { word: 'Failed', detail: 'at step 61,200 · Lost atoms' },
    water: { word: 'Draft', detail: 'No entry script' },
};
function cuStatus() {
    const st = S.sim === 'cu' ? S.run : 'running';
    const step = S.sim === 'cu' ? S.step : 184000;
    const m = 'This computer';
    switch (st) {
        case 'idle': return { word: 'Not run yet', detail: m };
        case 'building': return { word: 'Building', detail: `LAMMPS · ${Math.round(S.buildPct * 100)}% · ${m}` };
        case 'starting': return { word: 'Starting', detail: m };
        case 'running': return S.sim === 'cu' && S.phase === 'equil'
            ? { word: 'Equilibrating', detail: `step ${fmtInt(S.eqStep)} · ${m}` }
            : { word: 'Running', detail: `${Math.round(100 * step / STEPS_RUN)}% · ${etaText(step)} · ${m}` };
        case 'stopping': return { word: 'Stopping', detail: `step ${fmtInt(step)} · ${m}` };
        case 'cancelled': return { word: 'Stopped', detail: `at step ${fmtInt(step)} · ${m}` };
        case 'finished': return { word: 'Finished', detail: `500,000 steps in 13 min · ${m}` };
        case 'failed': return { word: 'Failed', detail: `at step ${fmtInt(step)} · ${m}` };
        default: return { word: '', detail: m };
    }
}
function cardCaptionHTML(s) {
    const c = s.id === 'cu' ? cuStatus() : CARD_STATUS[s.id];
    const failed = c.word === 'Failed';
    if (S.cardStyle === 'sections') return `<span${failed ? ' class="danger-ink"' : ''}>${esc(c.detail)}</span>`;
    return `<span class="card__state${failed ? ' danger-ink' : ''}">${esc(c.word)}</span> · ${esc(c.detail)}`;
}
const CARD_GROUPS = [
    ['Running', (st) => ['running', 'building', 'stopping'].includes(st)],
    ['Queued', (st) => st === 'queued'],
    ['Finished', (st) => st === 'finished' || st === 'stopped'],
    ['Failed', (st) => st === 'failed'],
    ['Drafts', (st) => st === 'draft'],
];

function cardHTML(s, previews) {
    const st = simState(s);
    const img = s.preview && previews[s.preview] && !(s.id === 'cu' && S.sim === 'cu' && ['idle', 'building', 'starting'].includes(S.run));
    const p = simProgress(s);
    const showProgress = p !== null && ['running', 'building', 'stopping'].includes(st);
    return `<article class="card${['running', 'building', 'stopping'].includes(st) ? '' : ' is-idle'}" data-card="${s.id}">
        <div class="card__frame" role="button" tabindex="0" data-open-sim="${s.id}" aria-label="Open ${esc(s.name)}">
            ${img ? `<img src="${previews[s.preview]}" alt="">` : `<div class="card__empty">${st === 'building' ? icon('loader', 'lg spin') : icon(st === 'draft' ? 'file-code' : 'atom', 'lg')}</div>`}
            <div class="card__foot">
                <div class="card__title">${esc(s.name)}</div>
                <div class="card__caption">${cardCaptionHTML(s)}</div>
                ${showProgress ? `<div class="card__progress"><i style="width:${(p * 100).toFixed(1)}%"></i></div>` : ''}
            </div>
        </div>
        <div class="card__menu"><button type="button" class="icon-btn sm" data-card-menu="${s.id}" aria-label="More actions for ${esc(s.name)}">${icon('more', 'sm')}</button></div>
    </article>`;
}

function renderSimulations() {
    const previews = refreshPreviews();
    const mf = S.machineFilter && MACHINES[S.machineFilter];
    const base = mf ? SIMS.filter((s) => s.machine === mf.id) : SIMS;
    const counts = Object.fromEntries(FILTERS.map(([k, , f]) => [k, base.filter((s) => f(simState(s))).length]));
    const flt = FILTERS.find(([k]) => k === S.simFilter)[2];
    const list = base.filter((s) => flt(simState(s)));
    $('#page-simulations').innerHTML = `
        <div class="page-title-row">
            <h1 class="page-title">Simulations</h1>
            <button type="button" class="btn primary" data-open="new">${icon('plus', 'sm')}New simulation</button>
        </div>
        <div class="filter-row"><div class="seg" role="group" aria-label="Filter simulations">${FILTERS.map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${S.simFilter === k}">${l}<span class="count">${counts[k]}</span></button>`).join('')}</div>
            <button type="button" class="filter-pop" data-pop="machinefilter" aria-haspopup="menu" aria-label="Machine: ${mf ? esc(mf.name) : 'All machines'}">${mf ? icon(mf.icon, 'sm') : ''}<span>${mf ? esc(mf.name) : 'All machines'}</span>${icon('chevrons', 'xs')}</button></div>
        ${list.length ? cardsHTML(list, previews) : `<div class="empty" style="margin:40px auto"><div class="empty__icon">${icon('atom')}</div><h3>Nothing here</h3><p>${mf && !base.length ? `No simulations on ${esc(mf.name)} yet.` : 'No simulation matches this filter.'}</p></div>`}`;
}

function cardsHTML(list, previews) {
    const grid = (items) => `<div class="grid cards-${S.cardStyle}">${items.map((s) => cardHTML(s, previews)).join('')}</div>`;
    if (S.cardStyle !== 'sections' || S.simFilter !== 'all') return grid(list);
    return CARD_GROUPS.map(([title, f]) => {
        const items = list.filter((s) => f(simState(s)));
        return items.length ? `<section class="card-group"><h2 class="card-group__title">${title}<span>${items.length}</span></h2>${grid(items)}</section>` : '';
    }).join('');
}

function updateCuCard() {
    if (S.view !== 'simulations' || S.page !== 'simulations') return;
    const card = $('[data-card="cu"]');
    if (!card) return;
    const cap = card.querySelector('.card__caption');
    if (cap) cap.innerHTML = cardCaptionHTML(SIMS[0]);
    const bar = card.querySelector('.card__progress i');
    const p = simProgress(SIMS[0]);
    if (bar && p !== null) bar.style.width = `${(p * 100).toFixed(1)}%`;
}

function renderDashboard() {
    S.page = 'simulations';
    renderSimulations();
}

/* ---------------- Menus ---------------- */

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } $('#display-pop').hidden = true; }
function openMenu(anchor, items, { width = 240, align = 'right', key = '' } = {}) {
    closeMenu();
    const r = anchor.getBoundingClientRect();
    menuEl = document.createElement('div');
    menuEl.className = 'popover glass';
    menuEl.style.zIndex = '100'; // above the modal backdrop, for popups inside Settings
    menuEl.setAttribute('role', 'menu');
    if (key) menuEl.dataset.key = key;
    menuEl.style.position = 'fixed';
    menuEl.style.width = `${width}px`;
    menuEl.innerHTML = items.map((it) => {
        if (it === '-') return '<div class="menu-sep"></div>';
        if (it.caption) return `<div class="menu-caption">${esc(it.caption)}</div>`;
        const check = it.checked === undefined ? '' : `<span class="menu-check">${it.checked ? icon('check', 'sm') : ''}</span>`;
        return `<button type="button" role="${it.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}" ${it.checked === undefined ? '' : `aria-checked="${it.checked}"`} class="menu-item${it.danger ? ' danger' : ''}" data-mi="${it.id}" ${it.disabled ? 'disabled' : ''}>${check}${it.icon ? icon(it.icon, 'sm') : ''}<span>${esc(it.label)}</span>${it.hint ? `<small class="menu-hint">${esc(it.hint)}</small>` : ''}${it.kbd ? `<span class="kbd">${it.kbd}</span>` : ''}</button>`;
    }).join('');
    document.body.appendChild(menuEl);
    const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    let left = align === 'right' ? r.right - mw : r.left;
    left = clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menuEl.style.left = `${left}px`; menuEl.style.top = `${top}px`;
    menuEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mi]');
        if (!b || b.disabled) return;
        const it = items.find((x) => x.id === b.dataset.mi);
        closeMenu();
        it && it.run && it.run();
    });
}

/* ---------------- Modals ---------------- */

function openModal(html, { onClose, wide = false } = {}) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="backdrop" data-backdrop><div class="modal glass" role="dialog" aria-modal="true" aria-labelledby="modal-title" ${wide ? 'style="width:min(720px,100%)"' : ''}>${html}</div></div>`;
    root._onClose = onClose;
    const first = root.querySelector('input, button:not([data-close])');
    first && first.focus();
}
function closeModal() {
    const root = $('#modal-root');
    if (!root.innerHTML) return false;
    root.innerHTML = '';
    clearInterval(root._timer);
    root._onClose && root._onClose();
    return true;
}
const closeBtn = `<button type="button" class="icon-btn" data-close aria-label="Close" style="margin-left:auto">${icon('x')}</button>`;
function stepsHTML(n) {
    const names = ['Host', 'Check', 'Install'];
    return `<div class="steps">${names.map((s, i) => `${i ? '<span class="line"></span>' : ''}<span class="${i <= n ? 'on' : ''}"><i>${i < n ? '✓' : i + 1}</i>${s}</span>`).join('')}</div>`;
}

const CONNECT = { host: 'hpc-login', name: 'hpc-login' };
function openConnect(step = 0) {
    if (step === 0) {
        openModal(`<div class="modal__head"><div><h2 id="modal-title">Connect a cluster</h2><p>Studio connects with your own SSH keys and config, checks what the machine has, and installs a small agent in your home folder. No root, no open ports.</p></div>${closeBtn}</div>
            ${stepsHTML(0)}
            <div><label class="label" for="conn-host">SSH host</label><input class="field mono" id="conn-host" value="${esc(CONNECT.host)}" placeholder="user@login.cluster.edu or a Host from ~/.ssh/config" autocomplete="off" spellcheck="false"></div>
            <div><span class="label">From ~/.ssh/config</span><div class="suggest">${['hpc-login', 'atlas', 'gpu-box', 'lab-server'].map((h) => `<button type="button" class="btn secondary sm mono" data-host="${h}">${h}</button>`).join('')}</div></div>
            <div><label class="label" for="conn-name">Name in Studio</label><input class="field" id="conn-name" value="${esc(CONNECT.name)}"></div>
            <details><summary class="muted" style="cursor:pointer;font-size:var(--text-sm)">Can’t reach the cluster with SSH from this computer?</summary>
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><p class="muted" style="margin:0;font-size:var(--text-sm)">Download lammps-agent on the cluster and pair it with this code. It connects out to Studio, so it works behind a VPN or a bastion.</p>
                <div class="cmd">./lammps-agent pair --code 7KQ-4MZ<button type="button" class="icon-btn sm copy" data-copy="./lammps-agent pair --code 7KQ-4MZ" aria-label="Copy command">${icon('copy', 'sm')}</button></div></div></details>
            <div class="modal__foot"><button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" data-conn-next="1">Check machine${icon('chev-right', 'sm')}</button></div>`);
        return;
    }
    if (step === 1) {
        const checks = [
            ['SSH connection', `${CONNECT.host} · key ~/.ssh/id_ed25519`, '0.4 s', 'ok'],
            ['Scheduler', 'Slurm 23.11 · partitions cpu, gpu, debug', '0.3 s', 'ok'],
            ['Container runtime', 'Docker not found · Apptainer 1.3 found, Studio will use it', '0.2 s', 'warn'],
            ['MPI', 'OpenMPI 4.1.6 with module load openmpi/4.1', '0.6 s', 'ok'],
            ['Storage', '/scratch/rherrera · 1.8 TB free', '0.2 s', 'ok'],
        ];
        openModal(`<div class="modal__head"><div><h2 id="modal-title">Checking ${esc(CONNECT.name)}</h2><p>Read-only checks. Nothing is installed yet.</p></div>${closeBtn}</div>
            ${stepsHTML(1)}
            <div class="check-list" id="checks">${checks.map((c, i) => `<div class="check" data-ci="${i}"><span class="check__state">${icon('loader', 'sm spin')}</span><span class="check__text"><span>${c[0]}</span><small>Waiting…</small></span><span class="check__time"></span></div>`).join('')}</div>
            <div class="modal__foot"><button type="button" class="btn ghost" data-conn-next="0">Back</button><button type="button" class="btn primary" data-conn-next="2" id="conn-next" disabled>Next${icon('chev-right', 'sm')}</button></div>`);
        let i = 0;
        const root = $('#modal-root');
        root._timer = setInterval(() => {
            const c = checks[i];
            const row = $(`[data-ci="${i}"]`);
            if (!row) { clearInterval(root._timer); return; }
            row.classList.add(c[3]);
            row.querySelector('.check__state').innerHTML = icon(c[3] === 'ok' ? 'check' : 'alert', 'sm');
            row.querySelector('small').textContent = c[1];
            row.querySelector('.check__time').textContent = c[2];
            i++;
            if (i >= checks.length) { clearInterval(root._timer); $('#conn-next').disabled = false; }
        }, 520);
        return;
    }
    if (step === 2) {
        openModal(`<div class="modal__head"><div><h2 id="modal-title">Install the agent</h2><p>lammps-agent is one 18 MB file. Studio copies it to ~/.lammps-studio on ${esc(CONNECT.name)} and talks to it through your SSH connection.</p></div>${closeBtn}</div>
            ${stepsHTML(2)}
            <div><label class="label" for="conn-root">Folder for simulations</label><input class="field mono" id="conn-root" value="/scratch/rherrera/lammps-studio"></div>
            <div><span class="label">Build LAMMPS</span><div class="seg sm" id="conn-build"><button type="button" aria-pressed="true" data-cb="login">On the login node</button><button type="button" aria-pressed="false" data-cb="job">As a Slurm job</button></div></div>
            <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><div style="font-size:var(--text-sm)">Reconnect automatically</div><div class="muted" style="font-size:var(--text-xs)">Runs keep going while Studio is closed. It catches up when you open it again.</div></div><button type="button" class="toggle" role="switch" aria-checked="true" aria-label="Reconnect automatically" data-toggle></button></div>
            <div class="check-list" id="install" hidden></div>
            <div class="modal__foot"><button type="button" class="btn ghost" data-conn-next="1">Back</button><button type="button" class="btn primary" id="conn-install">${icon('download', 'sm')}Install and connect</button></div>`);
    }
}
function runInstall() {
    const box = $('#install');
    const btn = $('#conn-install');
    if (!box || !btn) return;
    btn.disabled = true;
    box.hidden = false;
    const steps = ['Upload lammps-agent 0.1.0', 'Start the agent', 'Open a tunnel over SSH', 'Pull the base image with Apptainer'];
    box.innerHTML = steps.map((s, i) => `<div class="check" data-ii="${i}"><span class="check__state">${icon('loader', 'sm spin')}</span><span class="check__text"><span>${s}</span></span><span class="check__time"></span></div>`).join('');
    let i = 0;
    const root = $('#modal-root');
    root._timer = setInterval(() => {
        const row = $(`[data-ii="${i}"]`);
        if (!row) { clearInterval(root._timer); return; }
        row.classList.add('ok');
        row.querySelector('.check__state').innerHTML = icon('check', 'sm');
        row.querySelector('.check__time').textContent = ['1.2 s', '0.3 s', '0.4 s', '38 s'][i];
        i++;
        if (i >= steps.length) {
            clearInterval(root._timer);
            btn.disabled = false;
            btn.innerHTML = `${icon('check', 'sm')}Done`;
            btn.id = 'conn-done';
        }
    }, 600);
}

function openNewSim() {
    openModal(`<div class="modal__head"><div><h2 id="modal-title">New simulation</h2><p>Studio creates a folder for it on the machine you pick and opens it in VS Code. Put your script in main.in.</p></div>${closeBtn}</div>
        <div><label class="label" for="new-name">Name</label><input class="field" id="new-name" placeholder="Cu nanowire compression" value=""></div>
        <div><span class="label">Machine</span><div class="mach-opts" role="radiogroup" aria-label="Machine">${Object.values(MACHINES).map((m, i) => `<button type="button" class="mach-opt" role="radio" aria-checked="${i === 0}" data-new-mach="${m.id}" ${m.status === 'off' ? 'disabled style="opacity:.5"' : ''}>${icon(m.icon, 'sm')}<span><span>${esc(m.name)}</span><small>${m.status === 'off' ? 'Offline' : esc(m.kind)}</small></span></button>`).join('')}</div></div>
        <div><span class="label">Start from</span><div class="opt-cards" role="radiogroup" aria-label="Start from">
            ${[['empty', 'file-code', 'Empty main.in', 'units, atom_style and a run, ready to edit'], ['example', 'book', 'LAMMPS example', 'melt, crack, indent, min, flow…'], ['folder', 'folder', 'Folder on disk', 'Upload or point at an existing folder'], ['git', 'copy', 'Git repository', 'Clone it into the simulation folder']]
                .map(([k, ic, t, d], i) => `<button type="button" class="mach-opt" role="radio" aria-checked="${i === 0}" data-new-from="${k}">${icon(ic, 'sm')}<span><span>${t}</span><small>${d}</small></span></button>`).join('')}
        </div></div>
        <div class="modal__foot"><button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" id="new-create">Create and open</button></div>`);
}

/* ---------------- Command palette ---------------- */

function paletteCommands() {
    const cmds = [
        { label: 'Run simulation', kbd: 'Ctrl Enter', icon: 'play', run: () => runAction('run') },
        { label: 'Stop after the current step', kbd: 'Ctrl .', icon: 'stop', run: () => runAction('stop') },
        { label: 'Check input for problems', kbd: 'Ctrl ⇧ K', icon: 'check', run: () => toast('main.in: no problems found · 52 lines checked') },
        { label: 'Dry run, set up the system without time steps', icon: 'refresh', run: () => toast('Mockup: runs main.in with timer timeout 0') },
        { label: 'Set variables for the next run', kbd: 'Ctrl ⇧ V', icon: 'braces', run: () => { openWorkspace('cu'); S.varTab = 'variables'; setAct('variables'); } },
        { label: 'Show output', kbd: 'Ctrl ⇧ L', icon: 'terminal', run: () => { openWorkspace(S.sim); setAct('output'); } },
        { label: 'Show charts', kbd: 'Ctrl ⇧ C', icon: 'chart', run: () => { openWorkspace(S.sim); setAct('charts'); } },
        ...CHART_DEFS.map((d) => ({ label: `Plot ${d.name.toLowerCase()} against step`, icon: 'chart', run: () => { openWorkspace('cu'); S.featured = d.key; setAct('charts'); } })),
        { label: 'Plot stress against strain', icon: 'chart', run: () => { openWorkspace('cu'); S.featured = 'stress-strain'; setAct('charts'); } },
        { label: 'Export thermo data as CSV', icon: 'download', run: () => toast('Saved thermo-run3.csv to Downloads') },
        { label: 'Save image of the viewport', icon: 'camera', run: () => saveShot() },
        { label: 'Open the dump in VOLT', icon: 'external', run: () => toast('Opens wire.lammpstrj in VOLT for analysis') },
        { label: 'Change packages for this build', icon: 'package', run: () => { openWorkspace(S.sim); setAct('config'); } },
        { label: 'Connect a cluster', icon: 'plug', run: () => openConnect(0) },
        { label: 'New simulation', icon: 'plus', run: () => openNewSim() },
        { label: 'Go to simulations', icon: 'atom', run: () => { setView('simulations'); S.machineFilter = null; setPage('simulations'); } },
        ...Object.values(MACHINES).map((m) => ({ label: `Show simulations on ${m.name}`, icon: m.icon, run: () => { setView('simulations'); setMachine(m.id); } })),
        { label: 'Show builds', icon: 'layers', run: () => openSettings('builds') },
        { label: 'Open settings', icon: 'settings', run: () => openSettings('general') },
        { label: 'Switch between light and dark', icon: 'palette', run: () => setTheme(isDark() ? 'light' : 'dark') },
    ];
    return cmds;
}
function openPalette() {
    const cmds = paletteCommands();
    openModal(`<div style="display:flex;align-items:center;gap:10px">${icon('search', 'sm')}<input class="field" id="pal-q" placeholder="Run a command, open a file or plot a column" style="border:0;background:transparent;padding:0;height:28px" autocomplete="off" aria-label="Search commands"><span class="kbd">Esc</span></div>
        <div class="menu-sep" style="margin:0 -6px"></div><div id="pal-list" role="listbox" style="display:flex;flex-direction:column;max-height:50vh;overflow:auto;margin:-8px -10px"></div>`);
    const modal = $('#modal-root .modal');
    modal.style.width = 'min(560px, 100%)'; modal.style.gap = '12px'; modal.style.padding = '14px 16px';
    modal.closest('.backdrop').style.alignItems = 'start';
    modal.closest('.backdrop').style.paddingTop = '12vh';
    let sel = 0, shown = cmds;
    const draw = () => {
        $('#pal-list').innerHTML = shown.length ? shown.map((c, i) => `<button type="button" class="menu-item" role="option" aria-selected="${i === sel}" data-pal="${i}" style="${i === sel ? 'background:var(--tint)' : ''}">${icon(c.icon, 'sm')}<span>${esc(c.label)}</span>${c.kbd ? `<span class="kbd">${c.kbd}</span>` : ''}</button>`).join('') : '<div class="menu-caption" style="padding:10px 14px">No command matches.</div>';
    };
    draw();
    const q = $('#pal-q');
    q.addEventListener('input', () => { const v = q.value.toLowerCase().trim(); shown = cmds.filter((c) => c.label.toLowerCase().includes(v)); sel = 0; draw(); });
    q.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
        if (e.key === 'Enter' && shown[sel]) { const c = shown[sel]; closeModal(); c.run(); }
    });
    $('#pal-list').addEventListener('click', (e) => { const b = e.target.closest('[data-pal]'); if (!b) return; const c = shown[+b.dataset.pal]; closeModal(); c.run(); });
}

/* ---------------- Settings sheet: General, Machines (with a detail view), Builds ---------------- */

const SETTINGS_TABS = [['general', 'General'], ['machines', 'Machines'], ['builds', 'Builds']];
const SETTINGS = { tab: 'general', machine: null, keepRuns: true, notify: true, editor: 'studio' };
const machineStatus = (m) => (m.status === 'off' ? 'Offline' : m.running);

function settingsGeneral() {
    const theme = { system: 'System', light: 'Light', dark: 'Dark' }[S.themeOpt || 'system'];
    const toggle = (key, label) => `<button type="button" class="toggle" role="switch" aria-checked="${SETTINGS[key]}" aria-label="${esc(label)}" data-setting="${key}"></button>`;
    return gSection('Appearance', [gRow('Theme', popup('theme', theme, 'Theme'))])
        + gSection('Runs', [
            gRow('Keep runs going when Studio closes', toggle('keepRuns', 'Keep runs going when Studio closes')),
            gRow('Notify when a run finishes or fails', toggle('notify', 'Notify when a run finishes or fails')),
        ])
        + gSection('Editor', [gRow('Open files in', popup('editor', SETTINGS.editor === 'studio' ? 'VS Code in Studio' : 'External editor', 'Open files in'))]);
}

function settingsMachines() {
    if (SETTINGS.machine) return settingsMachine(MACHINES[SETTINGS.machine]);
    const rows = Object.values(MACHINES).map((m) => `<button type="button" class="grow" data-settings-machine="${m.id}">
        <span class="grow__icon">${icon(m.icon, 'sm')}</span>
        <span class="grow__main"><span class="grow__title">${esc(m.name)}</span><span class="grow__sub">${esc(m.kind)} · ${esc(m.runtime)}</span></span>
        <span class="grow__value">${esc(machineStatus(m))}</span><span class="grow__chev">${icon('chev-right', 'sm')}</span></button>`);
    rows.push(`<button type="button" class="grow grow--action" data-open="connect"><span class="grow__icon">${icon('plus', 'sm')}</span><span class="grow__title">Connect a cluster…</span></button>`);
    return gSection('', rows);
}

function settingsMachine(m) {
    const kv = [['Host', m.host, true], ['Hardware', m.cpu], ['Memory', m.mem], ...(m.gpus ? [['GPUs', String(m.gpus)]] : []), ['Runtime', m.runtime], ['Scheduler', m.scheduler], ['Agent', m.agent, true], ['Simulations folder', m.root, true]];
    const actions = m.status === 'off'
        ? [['Reconnect', `Trying ${m.host}…`], ['Show agent log', 'Shows the last 200 lines of the agent log'], [`Remove ${m.name}`, 'Mockup: asks before removing the machine', true]]
        : [['Open terminal', `Opens a terminal on ${m.name}`], ...(m.id === 'local' ? [] : [[`Disconnect ${m.name}`, 'Mockup: runs keep going on the cluster, Studio stops syncing', true]])];
    return `<button type="button" class="settings__back" data-settings-machine="">${icon('chev-left', 'sm')}Machines</button>
        <div class="settings__head"><span class="settings__icon">${icon(m.icon)}</span><div><div class="settings__name">${esc(m.name)}</div><div class="muted">${esc(m.kind)} · ${esc(machineStatus(m))}</div></div></div>`
        + gSection('', kv.map(([k, v, mono]) => gRow(k, `<span class="grow__path${mono ? ' mono' : ''}">${esc(v)}</span>`)))
        + gSection('', actions.map(([l, t, danger]) => `<button type="button" class="grow grow--action${danger ? ' danger-ink' : ''}" data-toast="${esc(t)}"><span class="grow__title">${esc(l)}</span></button>`));
}

function settingsBuilds() {
    const sections = Object.values(MACHINES).map((m) => {
        const rows = BUILDS.filter((b) => b.machine === m.id).map((b) => {
            const building = b.status === 'building';
            const sub = building ? `${b.hash} · building` : `${b.hash} · ${b.size} · ${b.used} simulation${b.used === 1 ? '' : 's'}`;
            return `<div class="grow"><span class="grow__main"><span class="grow__title">${b.pkgs.length ? b.pkgs.join(', ') : 'Core only'}</span><span class="grow__sub mono">${sub}</span></span><span class="grow__value">${building ? `${ring(0.41)}<span class="num">41%</span>` : esc(b.when)}</span></div>`;
        });
        return rows.length ? gSection(esc(m.name), rows) : '';
    });
    return sections.join('') + gSection('', [`<button type="button" class="grow grow--action" data-toast="Mockup: pick packages and a machine, Studio builds it ahead of time"><span class="grow__icon">${icon('plus', 'sm')}</span><span class="grow__title">New build…</span></button>`]);
}

function openSettings(tab = SETTINGS.tab, machine = null) {
    SETTINGS.tab = tab; SETTINGS.machine = machine;
    if (!$('#settings-body')) {
        openModal(`<div class="settings"><div class="settings__bar"><h2 id="modal-title">Settings</h2>
            <div class="seg" id="settings-tabs" role="group" aria-label="Settings sections">${SETTINGS_TABS.map(([k, l]) => `<button type="button" data-settings-tab="${k}" aria-pressed="false">${l}</button>`).join('')}</div>${closeBtn}</div>
            <div class="settings__body" id="settings-body"></div></div>`, { wide: true });
        const modal = $('#modal-root .modal');
        modal.classList.add('settings-modal');
        modal.tabIndex = -1;
        modal.focus(); // focus the sheet itself, not the first tab, so no focus ring shows on open
    }
    renderSettings();
}
function renderSettings() {
    const body = $('#settings-body');
    if (!body) return;
    $$('#settings-tabs [data-settings-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.settingsTab === SETTINGS.tab)));
    body.innerHTML = { general: settingsGeneral, machines: settingsMachines, builds: settingsBuilds }[SETTINGS.tab]();
    body.scrollTop = 0;
}

/* ---- src/05-run.js ---- */
/* ============================================================
   Part 5: run lifecycle, live log, viewport chrome, events, boot
   States mirror lammps-runtime's RunState plus the build step:
   idle → building → starting → running (equil, then tension) →
   stopping → cancelled | completed | failed. "noscript" is the
   folder-without-main.in case.
   ============================================================ */

const RUN_ID = '7c1e9a42';
const L = (t, c = '') => ({ t, c });

function logPreamble() {
    const m = MACHINES[S.machine];
    const hash = buildHashFor(S.machine, [...S.packages]) || pseudoHash([...S.packages].sort().join(',') + S.machine);
    return [
        L(`studio › run 3 on ${m.name} · build ${hash}`, 'meta'),
        L(`studio › container lammps-${RUN_ID} started · ${S.mpi} MPI × ${S.omp} OpenMP`, 'meta'),
        L(`studio › ${runCommand().replace('-in main.in', '-in /workspace/input/main.in')}`, 'meta'),
        L('LAMMPS (22 Jul 2025 - Update 1)', 'head'),
        L(`  using ${S.omp} OpenMP thread(s) per MPI task`),
        L('Lattice spacing in x,y,z = 3.615 3.615 3.615'),
        L('Created orthogonal box = (-36.15 -36.15 0) to (36.15 36.15 144.6)'),
        L('  2 by 2 by 2 MPI processor grid'),
        L(`Created ${NATOMS} atoms`),
        L('  using lattice units in orthogonal box = (-36.15 -36.15 0) to (36.15 36.15 144.6)'),
        L('  create_atoms CPU = 0.002 seconds'),
        L('Reading eam/alloy potential file potentials/Cu01.eam.alloy with DATE: 2007-10-12'),
        L('Neighbor list info ...'),
        L('  update: every = 1 steps, delay = 0 steps, check = yes'),
        L('  max neighbors/atom: 2000, page size: 100000'),
        L('  master list distance cutoff = 7.50679'),
        L('  ghost atom cutoff = 7.50679'),
        L('  binsize = 3.753395, bins = 20 20 39'),
        L('  2 neighbor lists, perpetual/occasional/extra = 1 1 0'),
        L('  (1) pair eam/alloy/omp, perpetual'),
        L('      attributes: half, newton on, omp'),
        L('  (2) compute cna/atom, occasional'),
        L('      attributes: full, newton on'),
        L('Setting up Verlet run ...'),
        L('  Unit style    : metal'),
        L('  Current step  : 0'),
        L('  Time step     : 0.001'),
        L('Per MPI rank memory allocation (min/avg/max) = 4.112 | 4.118 | 4.125 Mbytes'),
        L(fmtThermoHeader(COLS_EQ), 'head'),
    ];
}
const eqRow = (s) => L(fmtThermoRow(thermoEq(s), COLS_EQ), 'thermo');
const runRow = (s) => L(fmtThermoRow(thermoRun(s), COLS_RUN), 'thermo');
function timingLines(steps, loop, tps) {
    const nsday = (tps * 0.001 * 86400 / 1000).toFixed(3);
    return [
        L(`Loop time of ${loop} on 16 procs for ${steps} steps with ${NATOMS} atoms`), L(''),
        L(`Performance: ${nsday} ns/day, ${(24 / nsday).toFixed(3)} hours/ns, ${tps.toFixed(3)} timesteps/s, ${(tps * NATOMS / 1e6).toFixed(1)} Matom-step/s`),
        L('99.1% CPU use with 8 MPI tasks x 2 OpenMP threads'), L(''),
        L('MPI task timing breakdown:'),
        L('Section |  min time  |  avg time  |  max time  |%varavg| %total'),
        L('---------------------------------------------------------------'),
        L(`Pair    | ${(loop * 0.772).toFixed(4).padEnd(10)} | ${(loop * 0.785).toFixed(4).padEnd(10)} | ${(loop * 0.801).toFixed(4).padEnd(10)} |   5.2 | 78.53`),
        L(`Neigh   | ${(loop * 0.0266).toFixed(4).padEnd(10)} | ${(loop * 0.027).toFixed(4).padEnd(10)} | ${(loop * 0.0275).toFixed(4).padEnd(10)} |   0.9 |  2.70`),
        L(`Comm    | ${(loop * 0.0635).toFixed(4).padEnd(10)} | ${(loop * 0.0782).toFixed(4).padEnd(10)} | ${(loop * 0.0915).toFixed(4).padEnd(10)} |  18.4 |  7.82`),
        L(`Output  | ${(loop * 0.0007).toFixed(4).padEnd(10)} | ${(loop * 0.0008).toFixed(4).padEnd(10)} | ${(loop * 0.001).toFixed(4).padEnd(10)} |   0.0 |  0.08`),
        L(`Modify  | ${(loop * 0.0748).toFixed(4).padEnd(10)} | ${(loop * 0.0814).toFixed(4).padEnd(10)} | ${(loop * 0.0887).toFixed(4).padEnd(10)} |   9.1 |  8.14`),
        L(`Other   |            | ${(loop * 0.0273).toFixed(4).padEnd(10)} |            |       |  2.73`), L(''),
        L('Nlocal:         2223 ave        2301 max        2164 min'),
        L('Nghost:       2891.5 ave        3012 max        2790 min'),
        L('Neighs:        93710 ave       97048 max       90233 min'),
        L(''),
    ];
}
const eqFooter = () => timingLines(20000, 31.2103, 640.814);
const run2Preamble = () => [
    L('Setting up Verlet run ...'), L('  Unit style    : metal'), L('  Current step  : 0'), L('  Time step     : 0.001'),
    L('Per MPI rank memory allocation (min/avg/max) = 5.237 | 5.244 | 5.251 Mbytes'), L(fmtThermoHeader(COLS_RUN), 'head'),
];
const warnAfter = (s) => (s === 150000 || s === 172000 ? [L(`WARNING: Too many neighbors in CNA for ${s === 150000 ? 3 : 5} atoms (src/compute_cna_atom.cpp)`, 'warn')] : []);
const finishLines = () => [...timingLines(500000, 780.391, 640.705), L('Total wall time: 0:13:31'), L('studio › run 3 completed · exit code 0 · 13 min 31 s', 'meta')];
const failLines = (step) => [
    L('ERROR on proc 5: Neighbor list overflow, boost neigh_modify one (src/npair.cpp)', 'error'),
    L('Last command: run             500000', 'error'),
    L(`studio › LAMMPS exited with code 1 near step ${fmtInt(step)} · container removed`, 'meta'),
];
const cancelLines = (step) => [
    L('studio › stop requested · docker stop, 10 s grace', 'meta'),
    L(`studio › LAMMPS received SIGTERM near step ${fmtInt(step)}`, 'meta'),
    L(`studio › run 3 stopped · last restart file restart.${Math.floor(step / RESTART_EVERY) * RESTART_EVERY}.cu`, 'meta'),
];

function composeLog(upTo, phase, eqStep = STEPS_EQ) {
    const out = logPreamble();
    const eqEnd = phase === 'equil' ? eqStep : STEPS_EQ;
    for (let s = 0; s <= eqEnd; s += THERMO_EVERY) out.push(eqRow(s));
    if (phase === 'equil') return out;
    out.push(...eqFooter(), ...run2Preamble());
    for (let s = 0; s <= upTo; s += THERMO_EVERY) { out.push(runRow(s)); out.push(...warnAfter(s)); }
    return out;
}

/* ---------------- Lifecycle ---------------- */

let runTimer = 0, buildTimer = 0, phaseTimer = 0, playTimer = 0;
function clearTimers() {
    clearInterval(runTimer); clearInterval(buildTimer); clearTimeout(phaseTimer); clearTimeout(S.stopTimer);
    runTimer = buildTimer = phaseTimer = 0;
}

// Jump straight to a demo state (mockup bar).
function enterState(st) {
    clearTimers(); stopPlay();
    if (S.sim === 'cu' && st === 'noscript') S.cuLast = cuDashState();
    S.sim = st === 'noscript' ? 'water' : 'cu';
    S.run = st; S.live = true; S.banner = st === 'failed';
    S.packages = new Set(['MANYBODY', 'OPENMP']);
    if (st === 'noscript') { S.entry.water = null; S.packages = new Set(['KSPACE', 'MOLECULE', 'RIGID']); }
    switch (st) {
        case 'idle': case 'noscript':
            S.phase = 'equil'; S.eqStep = 0; S.step = 0; S.log = []; break;
        case 'building':
            S.phase = 'equil'; S.eqStep = 0; S.step = 0; S.log = []; S.buildPct = 0.36;
            S.packages = new Set(['MANYBODY', 'OPENMP', 'EXTRA-COMPUTE']);
            startBuild(); break;
        case 'running':
            S.phase = 'deform'; S.step = 184000; S.log = composeLog(184000, 'deform'); startRunLoop(); break;
        case 'stopping':
            S.phase = 'deform'; S.step = 184000; S.log = composeLog(184000, 'deform'); S.log.push(cancelLines(184000)[0]);
            S.stopTimer = setTimeout(finishStop, 2600); break;
        case 'finished':
            S.phase = 'deform'; S.step = STEPS_RUN; S.log = composeLog(STEPS_RUN, 'deform').concat(finishLines()); break;
        case 'failed':
            S.phase = 'deform'; S.step = S.failedAt; S.log = composeLog(S.failedAt, 'deform').concat(failLines(S.failedAt)); break;
    }
    S.warnings = S.log.filter((l) => l.c === 'warn').length;
    const b = $('#badge-output');
    b.textContent = String(S.warnings); b.hidden = !(S.warnings && !(S.panelOpen && S.act === 'output'));
    VIEW.fitPending = true;
    syncFrame();
    if (S.view === 'workspace') fitView();
    renderWorkspace();
    if (S.view === 'simulations') renderDashboard();
}

function syncFrame() {
    const n = framesAvailable();
    if (S.live || S.frame >= n) S.frame = Math.max(0, n - 1);
    S.atomsVisible = S.sim === 'cu' && (n > 0 || (S.run === 'running' && S.phase === 'equil'));
    const want = n ? S.frame * DUMP_EVERY : 0;
    if (S.sim === 'cu' && (VIEW.shownStep !== want || !VIEW.frameData)) showFrame(want);
    else renderLegend();
    VIEW.dirty = true;
}

function startRunLoop() { clearInterval(runTimer); runTimer = setInterval(tickRun, 650); }
function tickRun() {
    if (S.run !== 'running') return;
    if (S.phase === 'equil') {
        for (let k = 0; k < 2 && S.eqStep < STEPS_EQ; k++) { S.eqStep += THERMO_EVERY; appendLogLine(eqRow(S.eqStep)); }
        if (S.eqStep >= STEPS_EQ) {
            [...eqFooter(), ...run2Preamble()].forEach(appendLogLine);
            S.phase = 'deform'; S.step = 0; appendLogLine(runRow(0));
            syncFrame();
            if (S.act !== 'output') renderPanel();
        }
    } else {
        S.step += THERMO_EVERY;
        appendLogLine(runRow(S.step));
        warnAfter(S.step).forEach(appendLogLine);
        if (S.step >= STEPS_RUN) {
            finishLines().forEach(appendLogLine);
            S.run = 'finished'; clearInterval(runTimer);
            syncFrame(); renderWorkspace(); updateCuCard();
            toast('Cu nanowire tension finished · 500,000 steps');
            return;
        }
        if (S.step % DUMP_EVERY === 0) syncFrame();
    }
    liveRefresh();
}

function liveRefresh() {
    updateRunChrome();
    updateLens();
    refreshChartsIfVisible();
    if (S.view === 'workspace' && S.panelOpen && (S.act === 'outputs' || S.act === 'runs') && S.step % 10000 === 0 && !menuEl) {
        const sc = $('#panel-body').scrollTop; renderPanel(); $('#panel-body').scrollTop = sc;
        if (S.fileSel) selectFile(S.fileSel, { focus: false });
    }
    if (S.view === 'workspace' && S.panelOpen && S.act === 'variables' && !document.activeElement.matches('input')) {
        const sc = $('#panel-body').scrollTop; renderPanel(); $('#panel-body').scrollTop = sc;
    }
    updateCuCard();
}

function updateLens() {
    if (!(S.view === 'workspace' && S.panelOpen && S.act === 'editor' && S.sim === 'cu')) return;
    for (const no of [CU_RUN1_LINE, CU_RUN2_LINE]) {
        const el = $(`[data-lens="${no}"]`);
        const html = runLens(no);
        if (el && html) el.outerHTML = html;
        else if (!el && html) { renderPanel(); return; }
    }
}

const buildKey = () => [...S.packages].sort().join(',');
function startBuild() {
    clearInterval(buildTimer);
    buildTimer = setInterval(() => {
        S.buildPct = Math.min(1, S.buildPct + 0.0045);
        updateBuildCard();
        updateRunChrome();
        updateCuCard();
        if (S.buildPct >= 1) {
            clearInterval(buildTimer);
            KNOWN_BUILDS[`${S.machine}|${buildKey()}`] = pseudoHash(buildKey() + S.machine);
            toast(`LAMMPS built with ${[...S.packages].join(', ')} · saved for reuse`);
            startContainer();
        }
    }, 110);
}
function startContainer() {
    S.run = 'starting'; S.banner = false;
    renderWorkspace();
    phaseTimer = setTimeout(() => {
        S.run = 'running'; S.phase = 'equil'; S.eqStep = 0; S.step = 0; S.live = true; S.warnings = 0;
        S.log = logPreamble().concat(eqRow(0));
        VIEW.fitPending = true; syncFrame(); fitView();
        renderWorkspace();
        startRunLoop();
    }, 1500);
}
function finishStop() {
    S.run = 'cancelled';
    cancelLines(S.step).slice(1).forEach(appendLogLine);
    renderWorkspace(); updateCuCard();
}

function runAction(kind) {
    if (kind === 'run') {
        if (S.sim === 'water') {
            if (!S.entry.water) { toast('Choose the entry script first'); return; }
            toast('Only Cu nanowire tension runs in this mockup');
            return;
        }
        if (['running', 'stopping', 'building', 'starting'].includes(S.run)) return;
        clearTimers(); stopPlay();
        S.banner = false; S.live = true; S.log = []; S.warnings = 0; S.phase = 'equil'; S.step = 0; S.eqStep = 0; S.frame = 0;
        $('#badge-output').hidden = true;
        if (S.machine === 'atlas') toast('Submitted to atlas · Slurm job 48231');
        if (buildHashFor(S.machine, [...S.packages])) startContainer();
        else { S.run = 'building'; S.buildPct = 0; syncFrame(); renderWorkspace(); startBuild(); }
        return;
    }
    if (kind === 'stop') {
        if (S.run === 'running') {
            clearInterval(runTimer);
            S.run = 'stopping';
            appendLogLine(cancelLines(S.step)[0]);
            S.stopTimer = setTimeout(finishStop, 2400);
            renderWorkspace();
        } else if (S.run === 'building' || S.run === 'starting') {
            clearTimers(); S.run = 'idle'; syncFrame(); renderWorkspace(); toast(S.run === 'building' ? 'Build cancelled' : 'Start cancelled');
        }
        return;
    }
    if (kind === 'kill' && (S.run === 'running' || S.run === 'stopping')) {
        clearTimers();
        S.run = 'cancelled';
        appendLogLine(L(`studio › killed at step ${fmtInt(S.step)} · docker kill`, 'meta'));
        renderWorkspace();
    }
}

/* ---------------- Viewport chrome ---------------- */

// The run state as VOLT's jobs chip: a progress ring with a glyph, a label and a muted figure.
function runChip() {
    const pct = S.phase === 'equil' ? S.eqStep / STEPS_EQ : S.step / STEPS_RUN;
    switch (S.run) {
        case 'noscript': return { key: 'noscript', tone: 'warn', glyph: 'alert', label: 'No entry script', meta: '', jump: 'editor' };
        case 'building': {
            const left = Math.max(1, Math.round((1 - S.buildPct) * 7));
            return { key: 'building', ring: S.buildPct, glyph: 'package', label: 'Building LAMMPS', meta: `${Math.round(S.buildPct * 100)}% · about ${left} min left` };
        }
        case 'starting': return { key: 'starting', ring: 'spin', glyph: 'cpu', label: 'Starting', meta: '' };
        case 'running':
            if (S.phase === 'equil') return { key: 'equil', ring: pct, glyph: 'cpu', label: 'Equilibrating', meta: `${fmtInt(S.eqStep)} of 20,000 steps` };
            return { key: 'running', ring: pct, glyph: 'cpu', label: 'Running', meta: `${Math.floor(pct * 100)}% · ${etaText(S.step)}` };
        case 'stopping': return { key: 'stopping', ring: 'spin', glyph: 'stop', label: 'Stopping', meta: `step ${fmtInt(S.step)}` };
        case 'cancelled': return { key: 'cancelled', ring: pct, glyph: 'stop', label: 'Stopped', meta: `step ${fmtInt(S.step)} of 500,000` };
        case 'finished': return { key: 'finished', ring: 1, glyph: 'check', label: 'Completed', meta: '13 min 31 s' };
        case 'failed': return { key: 'failed', tone: 'danger', ring: pct, glyph: 'x', label: 'Failed', meta: `near step ${fmtInt(S.step)}` };
        default: return null; // Not run yet: the Run button says it all.
    }
}
const ringDash = (ring) => `${(ring === 'spin' ? 28 : clamp(ring, 0, 1) * 100).toFixed(1)} 100`;
function runChipHTML(c) {
    return `<span class="run-chip__label">${c.label}</span>${c.meta ? `<span class="run-chip__meta">${c.meta}</span>` : ''}`; // text only, no ring or glyph
}
function renderRunChip() {
    const el = $('#run-pill');
    const c = runChip();
    el.hidden = !c;
    if (!c) { el.dataset.key = ''; return; }
    // Rebuild only when the state changes, so the spinning ring keeps turning between ticks.
    if (el.dataset.key !== c.key) {
        el.className = `run-chip${c.tone ? ' ' + c.tone : ''}`;
        el.dataset.actJump = c.jump || 'output';
        el.dataset.tip = c.jump === 'editor' ? 'Open the editor' : 'Show output';
        el.innerHTML = runChipHTML(c);
        el.dataset.key = c.key;
        return;
    }
    const fill = el.querySelector('.run-ring__fill');
    if (fill && c.ring !== 'spin') fill.setAttribute('stroke-dasharray', ringDash(c.ring));
    const meta = el.querySelector('.run-chip__meta');
    if (meta && meta.textContent !== c.meta) meta.textContent = c.meta;
}

function runButtonHTML() {
    const chev = (cls) => `<button type="button" class="btn ${cls}" id="run-more" aria-label="More run options">${icon('chev-down', 'sm')}</button>`;
    switch (S.run) {
        case 'building': return `<button type="button" class="btn secondary" data-run="stop">${icon('x', 'sm')}Cancel build</button>`;
        case 'starting': return `<button type="button" class="btn primary" disabled>${icon('loader', 'sm spin')}Starting</button>`;
        case 'running': return `<button type="button" class="btn danger" data-run="stop" data-tip="Ctrl+." >${icon('stop', 'sm')}Stop</button>${chev('danger')}`;
        case 'stopping': return `<button type="button" class="btn danger" disabled>${icon('loader', 'sm spin')}Stopping</button>${chev('danger')}`;
        case 'noscript': return `<button type="button" class="btn primary" disabled>${icon('play', 'sm')}Run</button>`;
        case 'idle': return `<button type="button" class="btn primary" data-run="run" data-tip="Ctrl+Enter">${icon('play', 'sm')}Run</button>${chev('primary')}`;
        default: return `<button type="button" class="btn primary" data-run="run" data-tip="Ctrl+Enter">${icon('play', 'sm')}Run again</button>${chev('primary')}`;
    }
}

function infoHTML() {
    if (S.sim !== 'cu' || !S.atomsVisible) return '';
    const n = framesAvailable();
    if (S.run === 'running' && S.phase === 'equil') {
        return `<span class="vp-info__step">Step ${fmtInt(S.eqStep)}</span><span class="vp-info__meta">Equilibrating at 300 K · no dump yet</span>`;
    }
    const step = S.frame * DUMP_EVERY;
    const tr = thermoRun(step);
    const behind = !S.live && S.run === 'running' && S.frame < n - 1 ? ` · ${fmtInt(S.step - step)} steps behind` : '';
    return `<span class="vp-info__step">Step ${fmtInt(step)}</span><span class="vp-info__meta">${(step * 0.001).toFixed(1)} ps · ε ${tr.strain.toFixed(3)} · σ ${tr.stress.toFixed(2)} GPa${behind}</span>`;
}

function statusbarHTML() {
    const m = MACHINES[S.machine];
    const hash = buildHashFor(S.machine, [...S.packages]);
    const left = `<span class="statusbar__item">${icon(m.icon, 'xs')}${esc(m.name)}</span><span class="statusbar__sep"></span>`
        + `<span class="statusbar__item mono hide-md">${hash ? (S.machine === 'atlas' ? `lammps-${hash}.sif` : `lammps/lammps-runtime:${hash}`) : 'build pending'}</span><span class="statusbar__sep hide-md"></span>`
        + `<span class="statusbar__item">LAMMPS 22 Jul 2025</span><span class="statusbar__sep"></span><span class="statusbar__item">${S.mpi} MPI × ${S.omp} OpenMP</span>`;
    let right;
    if (S.run === 'running') {
        const tps = TPS * (1 + 0.012 * gauss2(S.step / 1000, 21));
        right = `<span class="statusbar__item">${(tps * 0.0864).toFixed(1)} ns/day</span><span class="statusbar__item">${Math.round(tps)} steps/s</span><span class="statusbar__item hide-md">CPU ${fmtInt(1571 + 14 * gauss2(S.step / 1000, 22))}%</span><span class="statusbar__item hide-md">1.2 GB</span>`;
    } else if (S.run === 'building') right = `<span class="statusbar__item">${icon('loader', 'xs spin')}Compiling on ${esc(m.name)}</span>`;
    else if (S.run === 'noscript') right = '<span class="statusbar__item">No entry script</span>';
    else right = '<span class="statusbar__item">Ready</span>';
    const entry = S.sim === 'cu' ? 'main.in' : (S.entry.water || 'no entry script');
    return `${left}<div class="statusbar__right">${right}<span class="statusbar__sep"></span><span class="statusbar__item">${icon('file-code', 'xs')}${esc(entry)}</span></div>`;
}

function updateRunChrome() {
    if (S.view !== 'workspace') return;
    renderRunChip();
    const wrap = $('#run-btn-wrap');
    const key = S.run;
    if (wrap.dataset.key !== key) { wrap.innerHTML = runButtonHTML(); wrap.dataset.key = key; }
    $('#config-chip-text').textContent = S.machine === 'atlas'
        ? `Slurm · ${S.slurm.partition} · ${S.slurm.nodes} node${S.slurm.nodes > 1 ? 's' : ''} · ${[...S.packages].join(' ')}`
        : `${S.mpi} MPI × ${S.omp} OpenMP · ${[...S.packages].join(' ')}`;
    $('#vp-info').innerHTML = infoHTML();
    $('#statusbar').innerHTML = statusbarHTML();
    const n = framesAvailable();
    $('#vp-bottom').hidden = !(S.sim === 'cu' && S.atomsVisible);
    const tl = $('#timeline');
    tl.hidden = !(S.sim === 'cu' && n > 0);
    if (!tl.hidden) {
        const lb = $('#tl-live');
        lb.setAttribute('aria-pressed', String(S.live && S.run === 'running'));
        lb.disabled = S.run !== 'running';
        lb.style.opacity = S.run === 'running' ? '' : '0.5';
        drawRuler();
    }
    const files = S.sim === 'cu' && !['idle', 'building', 'starting'].includes(S.run) ? 1 + (S.phase === 'deform' ? 1 : 0) + Math.min(10, Math.floor(S.step / RESTART_EVERY)) + (S.run === 'finished' ? 1 : 0) : 0;
    const bf = $('#badge-files'); bf.textContent = String(files); bf.hidden = !files;
    $('#vp-axes').toggleAttribute('hidden', !S.atomsVisible);
    renderLegend();
}

function buildCardHTML() {
    const p = S.buildPct;
    const steps = [
        ['Resolving the build', 0, 0.03], ['Pulling ubuntu:24.04', 0.03, 0.08], ['Installing compilers and OpenMPI', 0.08, 0.18],
        ['Cloning LAMMPS stable', 0.18, 0.26], ['Configuring with CMake', 0.26, 0.32], ['Compiling', 0.32, 0.96], ['Installing lmp', 0.96, 1],
    ];
    const files = Math.round(clamp((p - 0.32) / 0.64, 0, 1) * 1388);
    const cur = steps.find(([, a0, b0]) => p >= a0 && p < b0) || steps[steps.length - 1];
    const now = cur[0] === 'Compiling' ? `Compiling ${fmtInt(files)} of 1,388 files` : cur[0];
    const left = Math.max(1, Math.round((1 - p) * 7));
    const src = ['atom.cpp', 'pair_eam_alloy.cpp', 'neighbor.cpp', 'verlet.cpp', 'compute_cna_atom.cpp', 'fix_deform.cpp', 'pair_eam_omp.cpp', 'compute_pe_atom.cpp', 'domain.cpp', 'comm_brick.cpp', 'npair_half_bin_newton.cpp', 'dump_custom.cpp'];
    const details = S.buildDetails ? `<div class="build__details">
            ${steps.map(([n, a0, b0]) => `<div class="build__step${p >= b0 ? ' done' : p >= a0 ? ' active' : ''}">${p >= b0 ? icon('check', 'xs') : '<i></i>'}${n === 'Compiling' && p >= a0 ? `Compiling ${fmtInt(p >= b0 ? 1388 : files)} of 1,388 files` : n}</div>`).join('')}
            <div class="build__out mono">${p < 0.32 ? 'RUN cmake -S /opt/lammps-src/cmake -B build -DBUILD_MPI=yes …' : `Building CXX object src/CMakeFiles/lammps.dir/${src[Math.floor(files / 7) % src.length]}.o`}</div>
        </div>` : '';
    return `<div class="build">
        <h3 class="build__title">Building LAMMPS</h3>
        <p class="build__sub">${[...S.packages].join(' · ')} · ${esc(MACHINES[S.machine].name)}</p>
        <div class="build__bar" role="progressbar" aria-valuenow="${Math.round(p * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Build progress"><i style="width:${(p * 100).toFixed(1)}%"></i></div>
        <p class="build__now num">${now} · about ${left} min left</p>
        <button type="button" class="build__toggle" data-build-details aria-expanded="${!!S.buildDetails}">${S.buildDetails ? 'Hide details' : 'Show details'}${icon(S.buildDetails ? 'chev-up' : 'chev-down', 'xs')}</button>
        ${details}
    </div>`;
}
function updateBuildCard() {
    if (S.view !== 'workspace' || S.run !== 'building') return;
    const ov = $('#vp-overlay');
    if (!ov.hidden) ov.innerHTML = buildCardHTML();
}

const WATER_FILES = [
    ['water.lmp', '21 lines · has a run command', 'Most likely'],
    ['setup.lammps', '9 lines · included by water.lmp', ''],
    ['tip4p.data', 'data file · 12,288 atoms', ''],
    ['README.md', 'text', ''],
];
function overlayHTML() {
    if (S.sim === 'water') {
        if (S.run === 'noscript') {
            return `<div class="picker glass">
                <div class="row" style="flex-wrap:nowrap;gap:12px"><div class="empty__icon" style="color:var(--warning-ink);width:36px;height:36px">${icon('alert')}</div><div><h3>No script found. Which file should LAMMPS run?</h3></div></div>
                <p>Studio looks for main.in first, then any other .in file. This folder has neither, so pick the input script or type its path.</p>
                <div class="file-list" role="radiogroup" aria-label="Files in water-box">${WATER_FILES.map(([n, d, tag]) => `<button type="button" class="file-opt" role="radio" aria-checked="${S.waterPick === n}" data-pick="${n}"><span class="radio"></span><span class="mono" style="font-size:var(--text-xs)">${n}</span>${tag ? `<span class="chip ok" style="height:20px">${tag}</span>` : ''}<small>${d}</small></button>`).join('')}</div>
                <div><label class="label" for="entry-path">Or a path inside the folder</label><input class="field mono" id="entry-path" placeholder="inputs/run.lammps" value=""></div>
                <label class="row" style="flex-wrap:nowrap;font-size:var(--text-sm);gap:10px"><button type="button" class="toggle" role="switch" aria-checked="false" data-toggle id="entry-rename" aria-label="Rename to main.in"></button>Rename it to main.in so Studio finds it next time</label>
                <div class="row end"><button type="button" class="btn ghost" data-act-jump="editor">Open in editor</button><button type="button" class="btn primary" data-use-entry>Use as entry script</button></div>
            </div>`;
        }
        return `<div class="empty"><div class="empty__icon">${icon('atom')}</div><h3>Not run yet</h3><p>Press Run to start <span class="mono">${esc(S.entry.water)}</span> on ${esc(MACHINES[S.machine].name)}.</p><button type="button" class="btn ghost sm" data-repick>Change entry script</button></div>`;
    }
    if (S.run === 'idle') {
        return `<div class="empty"><div class="empty__icon">${icon('atom')}</div><h3>Not run yet</h3><p>Press Run to start main.in on ${esc(MACHINES[S.machine].name)}.</p></div>`;
    }
    if (S.run === 'building') return buildCardHTML();
    if (S.run === 'starting') return `<div class="empty"><div class="empty__icon">${icon('loader', 'spin')}</div><h3>Starting LAMMPS</h3><p>Copying main.in and potentials/ into the container and launching ${S.mpi} MPI ranks.</p></div>`;
    return '';
}
function renderOverlay() {
    const html = overlayHTML();
    const ov = $('#vp-overlay');
    ov.hidden = !html;
    ov.innerHTML = html;
}
function renderBanner() {
    const b = $('#banner');
    const on = !!(S.banner && S.run === 'failed');
    if (!on) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = `<span class="banner__icon">${icon('alert-circle', 'sm')}</span><div class="banner__body"><div class="banner__title">Run 3 failed near step ${fmtInt(S.step)}</div><div class="banner__msg">ERROR on proc 5: Neighbor list overflow, boost neigh_modify one</div></div>
        <div class="banner__actions"><button type="button" class="btn ghost sm" data-toast="Adds neigh_modify one 4000 to main.in, line 23">Add neigh_modify one 4000</button><button type="button" class="btn secondary sm" data-act-jump="output">Show in output</button></div>
        <button type="button" class="icon-btn sm" data-close-banner aria-label="Dismiss">${icon('x', 'sm')}</button>`;
}

function renderDisplayPop() {
    $('#display-pop').innerHTML = `<div class="menu-caption">Color atoms by</div>
        <div style="padding:2px 6px 8px"><div class="seg sm" id="color-mode">${[['structure', 'Structure'], ['pe', 'Energy'], ['type', 'Type']].map(([k, l]) => `<button type="button" data-color="${k}" aria-pressed="${S.colorMode === k}">${l}</button>`).join('')}</div></div>
        <div class="menu-caption"><label for="atom-size">Atom radius</label></div>
        <div style="padding:0 10px 8px;display:flex;align-items:center;gap:10px"><input type="range" id="atom-size" min="0.4" max="1.6" step="0.05" value="${S.atomScale}" style="flex:1;accent-color:var(--fg)"><span class="mono num" id="atom-size-v" style="font-size:var(--text-xs);width:52px;text-align:right">${(1.28 * S.atomScale).toFixed(2)} Å</span></div>
        <div class="menu-sep"></div>
        <button type="button" class="menu-item" data-copy="dump img all image 2000 img.*.png c_cna type size 1600 1200 view 80 -35 box yes 0.02 axes yes 0.6 0.03">${icon('copy', 'sm')}<span>Copy as dump image command</span></button>
        <button type="button" class="menu-item" data-toast="Saved colors as cna-colors.json">${icon('download', 'sm')}<span>Save colors</span></button>`;
}

function renderWorkspace() {
    const sim = SIMS.find((s) => s.id === S.sim);
    $('#ws-title').textContent = sim.name;
    $('#ws-machine').textContent = MACHINES[S.machine].name;
    $('#run-btn-wrap').dataset.key = '';
    updateRunChrome();
    renderOverlay();
    renderBanner();
    renderPanel();
    syncMockbar();
    VIEW.dirty = true;
}

function syncMockbar() {
    const map = { idle: 'idle', building: 'building', starting: 'building', running: 'running', stopping: 'stopping', cancelled: 'stopping', finished: 'finished', failed: 'failed', noscript: 'noscript' };
    const key = S.sim === 'water' ? 'noscript' : map[S.run];
    $$('#mock-state button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.state === key)));
}

/* ---------------- Views, theme ---------------- */

function setView(v) {
    S.view = v;
    $('#view-dashboard').hidden = v !== 'simulations';
    $('#view-workspace').hidden = v !== 'workspace';
    $$('#mock-view button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    closeMenu();
    if (v === 'workspace') {
        sizeViewport();
        if (VIEW.fitPending || !VIEW.fitted) { fitView(); VIEW.fitted = true; }
        renderWorkspace();
        requestAnimationFrame(() => { drawRuler(); VIEW.dirty = true; if (S.act === 'charts') renderPanel(); });
    } else renderDashboard();
}
function setPage(p) { S.page = p; renderDashboard(); $('.page-scroll').scrollTop = 0; }
function setMachine(id) { S.machineFilter = id; S.simFilter = 'all'; setPage('simulations'); }
function openWorkspace(id) {
    if (id === 'cu') {
        if (S.sim !== 'cu') enterState(S.cuLast && S.cuLast !== 'running' ? { draft: 'idle', building: 'building', stopping: 'stopping', stopped: 'stopping', finished: 'finished', failed: 'failed' }[S.cuLast] || 'running' : 'running');
        setView('workspace');
    } else if (id === 'water') {
        if (S.sim !== 'water') enterState('noscript');
        setView('workspace');
    } else {
        toast('Sample data. Only Cu nanowire tension and Water box open in this mockup.');
    }
}

function setTheme(opt) {
    S.themeOpt = opt;
    if (opt === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', opt);
    $$('#mock-theme button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeOpt === opt)));
    onThemeChange();
}
function onThemeChange() {
    applyViewportTheme();
    drawRuler();
    if (S.view === 'simulations') renderDashboard();
    else { renderPanel(); updateRunChrome(); }
    VIEW.dirty = true;
}

/* ---------------- Timeline ---------------- */

function setFrame(f, { live = false } = {}) {
    const n = framesAvailable();
    if (!n) return;
    S.frame = clamp(f, 0, n - 1);
    S.live = live || (S.run === 'running' && S.frame === n - 1 && S.live);
    showFrame(S.frame * DUMP_EVERY);
    VIEW.dirty = true;
    updateRunChrome();
}
function stopPlay() {
    clearInterval(playTimer); playTimer = 0;
    const b = $('#tl-play');
    if (b) { b.innerHTML = icon('play', 'sm'); b.dataset.tip = 'Play frames'; }
}
function togglePlay() {
    if (playTimer) { stopPlay(); return; }
    const n = framesAvailable();
    if (n < 2) return;
    S.live = false;
    if (S.frame >= n - 1) S.frame = 0;
    $('#tl-play').innerHTML = icon('stop', 'sm');
    $('#tl-play').dataset.tip = 'Pause';
    playTimer = setInterval(() => {
        const m = framesAvailable();
        if (S.frame >= m - 1) { stopPlay(); S.live = S.run === 'running'; updateRunChrome(); return; }
        setFrame(S.frame + 1);
    }, 110);
}

function saveShot() {
    toast(`Saved cu-nanowire-step-${S.frame * DUMP_EVERY}.png to runs/run-3`);
}

/* ---------------- Events ---------------- */

function onClick(e) {
    const t = e.target;
    const q = (sel) => t.closest(sel);
    let el;

    const popWasOpen = menuEl && menuEl.dataset.key;
    if (menuEl && !q('.popover') && !q('#run-more') && !q('[data-card-menu]') && !q('#chart-export')) closeMenu();
    if (!$('#display-pop').hidden && !q('#display-pop') && !q('#btn-display')) $('#display-pop').hidden = true;

    if ((el = q('[data-backdrop]')) && t === el) { closeModal(); return; }
    if (q('[data-close]')) { closeModal(); return; }

    if ((el = q('#mock-view [data-view]'))) { setView(el.dataset.view); return; }
    if ((el = q('#mock-state [data-state]'))) { enterState(el.dataset.state); if (S.view !== 'workspace') setView('workspace'); return; }
    if ((el = q('#mock-theme [data-theme-opt]'))) { setTheme(el.dataset.themeOpt); return; }
    if ((el = q('#mock-cards [data-cards]'))) {
        S.cardStyle = el.dataset.cards;
        $$('#mock-cards button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
        if (S.view !== 'simulations') setView('simulations'); else renderDashboard();
        return;
    }

    if ((el = q('[data-page]'))) { if (S.view !== 'simulations') setView('simulations'); if (el.dataset.page === 'simulations') S.machineFilter = null; setPage(el.dataset.page); closeModal(); return; }
    if ((el = q('[data-machine]'))) { if (S.view !== 'simulations') setView('simulations'); setMachine(el.dataset.machine); return; }
    if ((el = q('[data-open]'))) {
        const k = el.dataset.open;
        if (k === 'connect') openConnect(0); else if (k === 'new') openNewSim(); else if (k === 'settings') openSettings(); else openPalette();
        return;
    }
    if ((el = q('[data-settings-tab]'))) { openSettings(el.dataset.settingsTab); return; }
    if ((el = q('[data-settings-machine]'))) { SETTINGS.machine = el.dataset.settingsMachine || null; renderSettings(); return; }
    if ((el = q('[data-setting]'))) { const k = el.dataset.setting; SETTINGS[k] = !SETTINGS[k]; el.setAttribute('aria-checked', String(SETTINGS[k])); return; }
    if ((el = q('[data-filter]'))) { S.simFilter = el.dataset.filter; renderSimulations(); return; }
    if ((el = q('[data-card-menu]'))) {
        const s = SIMS.find((x) => x.id === el.dataset.cardMenu);
        openMenu(el, [
            { id: 'open', label: 'Open', icon: 'external', run: () => openWorkspace(s.id) },
            { id: 'dup', label: 'Duplicate', icon: 'copy', run: () => toast(`Duplicated ${s.name}`) },
            { id: 'folder', label: 'Show folder', icon: 'folder', run: () => toast(`${MACHINES[s.machine].root}/${s.folder || s.id}`) },
            '-',
            { id: 'del', label: 'Delete', icon: 'x', danger: true, run: () => toast('Mockup: asks before deleting the folder and its runs') },
        ], { width: 200 });
        return;
    }
    if ((el = q('[data-open-sim]'))) { openWorkspace(el.dataset.openSim); return; }

    if (q('#ws-back')) { setView('simulations'); return; }
    if ((el = q('.act[data-act]'))) { setAct(el.dataset.act, { toggle: true }); return; }
    if ((el = q('[data-act-open]'))) { setAct(el.dataset.actOpen); return; }
    if ((el = q('[data-act-jump]'))) { setAct(el.dataset.actJump); return; }

    if ((el = q('[data-run]'))) { runAction(el.dataset.run); return; }
    if ((el = q('#run-more'))) {
        const running = S.run === 'running' || S.run === 'stopping';
        openMenu(el, running ? [
            { id: 'stop', label: 'Stop after the current step', icon: 'stop', kbd: 'Ctrl .', run: () => runAction('stop'), disabled: S.run === 'stopping' },
            { id: 'kill', label: 'Kill now', icon: 'x', danger: true, run: () => runAction('kill') },
            '-',
            { id: 'ext', label: 'Extend by 100,000 steps', icon: 'plus', run: () => toast('Mockup: queues run 100000 after the current run') },
        ] : [
            { id: 'run', label: 'Run main.in', icon: 'play', kbd: 'Ctrl ↵', run: () => runAction('run') },
            { id: 'check', label: 'Check input for problems', icon: 'check', kbd: 'Ctrl ⇧ K', run: () => toast('main.in: no problems found · 52 lines checked') },
            { id: 'dry', label: 'Dry run without time steps', icon: 'refresh', run: () => toast('Mockup: runs main.in with timer timeout 0') },
            { id: 'vars', label: 'Run with different variables…', icon: 'braces', run: () => setAct('variables') },
            '-',
            { caption: 'Run on' },
            ...Object.values(MACHINES).map((m) => ({ id: 'm-' + m.id, label: m.name + (S.machine === m.id ? ' · current' : ''), icon: m.icon, disabled: m.status === 'off', run: () => { S.machine = m.id; renderWorkspace(); toast(`Next run goes to ${m.name}`); } })),
        ], { width: 270 });
        return;
    }

    if (q('#btn-display')) {
        const p = $('#display-pop');
        p.hidden = !p.hidden;
        if (!p.hidden) renderDisplayPop();
        return;
    }
    if ((el = q('[data-color]'))) { S.colorMode = el.dataset.color; recolorAtoms(); renderDisplayPop(); return; }
    if (q('#btn-box')) { S.showBox = !S.showBox; $('#btn-box').setAttribute('aria-pressed', String(S.showBox)); VIEW.dirty = true; return; }
    if (q('#btn-axes')) { S.showAxes = !S.showAxes; $('#btn-axes').setAttribute('aria-pressed', String(S.showAxes)); VIEW.dirty = true; drawAxes(); return; }
    if (q('#btn-reset')) { fitView(); return; }
    if (q('#btn-shot')) { saveShot(); return; }
    if (q('#btn-full')) { setAct(S.act, { toggle: true }); if (!S.panelOpen) return; return; }

    if (q('#tl-first')) { stopPlay(); setFrame(0); return; }
    if (q('#tl-prev')) { stopPlay(); S.live = false; setFrame(S.frame - 1); return; }
    if (q('#tl-next')) { stopPlay(); setFrame(S.frame + 1); return; }
    if (q('#tl-last')) { stopPlay(); setFrame(framesAvailable() - 1, { live: S.run === 'running' }); return; }
    if (q('#tl-play')) { togglePlay(); return; }
    if (q('#tl-live')) { stopPlay(); S.live = !S.live; if (S.live) setFrame(framesAvailable() - 1, { live: true }); else updateRunChrome(); return; }

    if (q('[data-build-details]')) { S.buildDetails = !S.buildDetails; renderOverlay(); return; }
    if ((el = q('[data-close-banner]'))) { S.banner = false; renderBanner(); return; }

    if ((el = q('#log-filter [data-f]'))) { S.logFilter = el.dataset.f; renderPanel(); return; }
    if (q('#log-follow')) { S.follow = !S.follow; $('#log-follow').setAttribute('aria-pressed', String(S.follow)); if (S.follow) $('#panel-body').scrollTop = $('#panel-body').scrollHeight; return; }
    if (q('[data-copy-log]')) { copyText(S.log.map((l) => l.t).join('\n'), 'Copied the log'); return; }
    if ((el = q('#plot-mode [data-m]'))) { S.plotMode = el.dataset.m; renderPanel(); return; }
    if ((el = q('[data-feature]'))) { S.featured = el.dataset.feature; renderPanel(); return; }
    if ((el = q('#chart-export'))) {
        openMenu(el, [['CSV', 'csv'], ['Gnuplot', 'dat'], ['YAML', 'yaml'], ['PNG image', 'png']].map(([f, ext]) => ({ id: ext, label: f, hint: `.${ext}`, run: () => toast(`Saved thermo-run3.${ext} to Downloads`) })), { width: 180 });
        return;
    }
    if ((el = q('[data-vt]'))) { S.varTab = el.dataset.vt; renderPanel(); return; }
    if (q('[data-clear-vars]')) { S.overrides = { T: '', erate: '', seed: '' }; renderPanel(); }

    if ((el = q('[data-pop]'))) {
        if (popWasOpen === el.dataset.pop) return; // second click on the same popup closes it
        openSettingPop(el.dataset.pop, el);
        return;
    }
    if ((el = q('[data-step]'))) {
        const k = el.dataset.step, d = +el.dataset.d;
        const [lo, hi] = k === 'gpus' ? [0, MACHINES[S.machine].gpus] : STEP_LIMITS[k];
        if (k === 'nodes') S.slurm.nodes = clamp(S.slurm.nodes + d, lo, hi); else S[k] = clamp(S[k] + d, lo, hi);
        const sc = $('#panel-body').scrollTop; renderPanel(); $('#panel-body').scrollTop = sc; updateRunChrome();
        const again = $(`[data-step="${k}"][data-d="${d}"]`); if (again && !again.disabled) again.focus();
        return;
    }
    if ((el = q('[data-crumb]'))) { S.filesPath = fileDir().path.slice(0, +el.dataset.crumb); S.fileSel = null; renderPanel(); return; }
    if ((el = q('[data-frow]'))) { selectFile(el.dataset.frow); return; }
    if (q('.finder__list') && !q('[data-frow]')) { selectFile(null, { focus: false }); return; }
    if ((el = q('[data-run-folder]'))) { if (el.disabled) return; S.filesPath = ['runs', el.dataset.runFolder]; S.fileSel = null; setAct('outputs'); return; }
    if (q('[data-copy-cmd]')) { copyText(runCommand(), 'Copied the command'); return; }
    if ((el = q('[data-copy]'))) { copyText(el.dataset.copy); return; }

    if ((el = q('[data-pick]'))) { S.waterPick = el.dataset.pick; $$('[data-pick]').forEach((b) => b.setAttribute('aria-checked', String(b === el))); return; }
    if (q('[data-use-entry]')) {
        const path = ($('#entry-path') || {}).value;
        const rename = ($('#entry-rename') || {}).getAttribute && $('#entry-rename').getAttribute('aria-checked') === 'true';
        S.entry.water = rename ? 'main.in' : (path && path.trim()) || S.waterPick;
        S.run = 'idle';
        renderWorkspace();
        toast(rename ? `Renamed ${S.waterPick} to main.in` : `Entry script set to ${S.entry.water}`);
        return;
    }
    if (q('[data-repick]')) { S.run = 'noscript'; renderWorkspace(); return; }
    if ((el = q('[data-toggle]'))) { el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true')); return; }

    // modals
    if ((el = q('[data-host]'))) { $('#conn-host').value = el.dataset.host; $('#conn-name').value = el.dataset.host; return; }
    if ((el = q('[data-conn-next]'))) {
        if (el.disabled) return;
        const h = $('#conn-host'); if (h) { CONNECT.host = h.value.trim() || 'hpc-login'; CONNECT.name = ($('#conn-name').value || CONNECT.host).trim(); }
        clearInterval($('#modal-root')._timer);
        openConnect(+el.dataset.connNext);
        return;
    }
    if ((el = q('#conn-build [data-cb]'))) { $$('#conn-build button').forEach((b) => b.setAttribute('aria-pressed', String(b === el))); return; }
    if (q('#conn-install')) { runInstall(); return; }
    if (q('#conn-done')) { closeModal(); toast(`${CONNECT.name} is connected · lammps-agent 0.1.0`); return; }
    if ((el = q('[data-new-mach]'))) { $$('[data-new-mach]').forEach((b) => b.setAttribute('aria-checked', String(b === el))); return; }
    if ((el = q('[data-new-from]'))) { $$('[data-new-from]').forEach((b) => b.setAttribute('aria-checked', String(b === el))); return; }
    if (q('#new-create')) { const n = ($('#new-name').value || 'Untitled simulation').trim(); closeModal(); toast(`Created ${n} with an empty main.in`); return; }

    if ((el = q('[data-toast]'))) { toast(el.dataset.toast); return; }
}

function onInput(e) {
    const t = e.target;
    if (t.matches('[data-var]')) {
        S.overrides[t.dataset.var] = t.value.trim();
        t.classList.toggle('over', !!S.overrides[t.dataset.var]);
        return;
    }
    if (t.matches('[data-num]')) {
        const v = parseInt(t.value, 10);
        if (Number.isFinite(v) && v >= 0) S[t.dataset.num] = v;
        const cmd = $('#cfg-cmd'); if (cmd) cmd.firstChild.textContent = runCommand();
        updateRunChrome();
        return;
    }
    if (t.matches('[data-slurm]')) {
        S.slurm[t.dataset.slurm] = t.dataset.slurm === 'nodes' ? Math.max(1, parseInt(t.value, 10) || 1) : t.value;
        const cmd = $('#cfg-cmd'); if (cmd) cmd.firstChild.textContent = runCommand();
        updateRunChrome();
        return;
    }
    if (t.id === 'atom-size') {
        S.atomScale = parseFloat(t.value);
        $('#atom-size-v').textContent = `${(1.28 * S.atomScale).toFixed(2)} Å`;
        VIEW.dirty = true;
    }
}

function onKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') {
        if (closeModal()) return;
        closeMenu();
        return;
    }
    if (mod && e.key.toLowerCase() === 'k' && !e.shiftKey) { e.preventDefault(); openPalette(); return; }
    if ($('#modal-root').innerHTML) return;
    if (S.view !== 'workspace') return;
    if (mod && e.key === 'Enter') { e.preventDefault(); runAction('run'); return; }
    if (mod && e.key === '.') { e.preventDefault(); runAction('stop'); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); setAct('output'); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); setAct('charts'); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); toast('main.in: no problems found · 52 lines checked'); return; }
    if (e.target.matches('[data-frow]') && ['ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'Enter') { openFile(e.target.dataset.frow); return; }
        const rows = $$('[data-frow]');
        const i = rows.indexOf(e.target);
        const j = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1);
        selectFile(rows[j].dataset.frow);
        return;
    }
    const inField = e.target.matches('input, textarea, select');
    if (!inField && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('#resize')) {
        if (!framesAvailable()) return;
        stopPlay();
        if (e.key === 'ArrowLeft') S.live = false;
        setFrame(S.frame + (e.key === 'ArrowLeft' ? -1 : 1));
    }
}

function bindResize() {
    const rz = $('#resize'), panel = $('#panel');
    const setW = (w) => {
        const total = $('#ws-body').clientWidth;
        panel.style.setProperty('--panel-w', `${clamp(w, 320, total * 0.7)}px`);
    };
    rz.addEventListener('pointerdown', (e) => {
        rz.setPointerCapture(e.pointerId);
        rz.classList.add('dragging');
        const x0 = e.clientX, w0 = panel.offsetWidth;
        const move = (ev) => setW(w0 + ev.clientX - x0);
        const up = () => { rz.classList.remove('dragging'); rz.removeEventListener('pointermove', move); rz.removeEventListener('pointerup', up); };
        rz.addEventListener('pointermove', move);
        rz.addEventListener('pointerup', up);
    });
    rz.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') setW(panel.offsetWidth - 24);
        if (e.key === 'ArrowRight') setW(panel.offsetWidth + 24);
    });
    let tmr = 0;
    new ResizeObserver(() => {
        clearTimeout(tmr);
        tmr = setTimeout(() => { if (S.view === 'workspace' && S.panelOpen && S.act === 'charts') { const b = $('#panel-body'); if (b.querySelector('#charts')) drawCharts(b, thermoRows()); } }, 120);
    }).observe(panel);
    new ResizeObserver(() => drawRuler()).observe($('#ruler'));
}

function ruler() {
    const r = $('#ruler');
    const pick = (e) => {
        const n = framesAvailable();
        if (!n) return;
        const rect = r.getBoundingClientRect();
        const f = Math.round(((e.clientX - rect.left - 6) / (rect.width - 12)) * (NFRAMES - 1));
        stopPlay();
        const live = S.run === 'running' && f >= n - 1;
        S.live = live;
        setFrame(Math.min(f, n - 1), { live });
    };
    r.addEventListener('pointerdown', (e) => { r.setPointerCapture(e.pointerId); pick(e); const mv = (ev) => pick(ev); const up = () => { r.removeEventListener('pointermove', mv); r.removeEventListener('pointerup', up); }; r.addEventListener('pointermove', mv); r.addEventListener('pointerup', up); });
}

/* ---------------- Boot ---------------- */

function boot() {
    VIEW.target = window.THREE ? new THREE.Vector3(0, 0, 0) : null;
    if (window.THREE) initViewport();
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open-sim]')) { e.preventDefault(); openWorkspace(e.target.dataset.openSim); }
    });
    document.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-frow]'); if (r) openFile(r.dataset.frow); });
    document.addEventListener('contextmenu', (e) => {
        const r = e.target.closest('[data-frow]');
        if (!r) return;
        e.preventDefault();
        selectFile(r.dataset.frow);
        fileMenu(r.dataset.frow, { x: e.clientX, y: e.clientY });
    });
    bindResize();
    ruler();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.themeOpt === 'system') onThemeChange(); });
    S.themeOpt = 'system';
    enterState('running');
    setAct('editor');
    const start = (location.hash || '').replace('#', '');
    setView(start === 'workspace' ? 'workspace' : 'simulations');
    if (!window.THREE) toast('Could not load three.js, so the 3D view is off');
}
boot();
})();
