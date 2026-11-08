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
