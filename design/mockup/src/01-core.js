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
