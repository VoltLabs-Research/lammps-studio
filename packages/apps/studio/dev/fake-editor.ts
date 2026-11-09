import { editorRoutes } from '@lammps-studio/contracts/editor/routes';
import { get } from '@lammps-studio/contracts/shared/routing';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { scriptFiles } from './fake-folders';
import { withSimulation } from './fake-helpers';
import { HtmlPage, route, Route } from './fake-router';
import { FakeState, filesOf } from './fake-state';

const EDITOR_PAGE = get<HtmlPage>('/dev/editor/:simulationId');

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
};

const STYLE = `
:root{ color-scheme: light dark; --code-bg: #ffffff; --code-fg: #3b3b3b; --code-gutter: #6e7681; --code-border: #e5e5e5; --code-side: #f8f8f8; }
@media (prefers-color-scheme: dark){ :root{ --code-bg: #1f1f1f; --code-fg: #cccccc; --code-gutter: #6e7681; --code-border: #2b2b2b; --code-side: #181818; } }
body{ margin: 0; background: var(--code-bg); color: var(--code-fg); font: 13px/20px 'Geist Mono', ui-monospace, monospace; }
header{ padding: 6px 16px; background: var(--code-side); border-bottom: 1px solid var(--code-border); color: var(--code-gutter); }
pre{ margin: 0; padding: 8px 0; }
.ln{ display: block; padding-right: 16px; white-space: pre; }
.ln__no{ display: inline-block; width: 40px; margin-right: 24px; text-align: right; color: var(--code-gutter); user-select: none; }
li{ padding: 2px 0; }
`;

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

const numbered = (text: string): string => text.replace(/\n$/, '').split('\n')
    .map((line, index) => `<span class='ln'><span class='ln__no'>${index + 1}</span>${escapeHtml(line)}</span>`)
    .join('');

const pageOf = (title: string, header: string, body: string): HtmlPage => new HtmlPage(`<!doctype html>
<html lang='en'>
<head><meta charset='utf-8'><title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><header>${escapeHtml(header)}</header>${body}</body>
</html>
`);

const editorPage = (state: FakeState, simulation: Simulation): HtmlPage => {
    const files = scriptFiles(filesOf(state, simulation.id));
    const entry = files.find((file) => file.path === simulation.entry);
    if(entry) return pageOf(entry.path, `${simulation.folder}/${entry.path}`, `<pre>${numbered(entry.text)}</pre>`);

    const names = files.map((file) => `<li>${escapeHtml(file.path)}</li>`).join('');

    return pageOf(simulation.folder, `${simulation.folder} · no entry script`, `<ul>${names}</ul>`);
};

export const editorRoutesFor = (state: FakeState, origin: string): Route[] => [
    route(editorRoutes.open, ({ simulationId }) => withSimulation(state, simulationId, ({ id }) => ({ url: `${origin}/dev/editor/${encodeURIComponent(id)}` })))
];

export const editorPagesFor = (state: FakeState): Route[] => [
    route(EDITOR_PAGE, ({ simulationId }) => withSimulation(state, simulationId, (simulation) => editorPage(state, simulation)))
];
