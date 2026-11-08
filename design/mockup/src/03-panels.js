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
