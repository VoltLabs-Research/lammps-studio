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
