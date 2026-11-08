import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Shot{
    url: string;
    out: string;
    width: number;
    height: number;
    dark: boolean;
    css?: string;
    steps?: string[];
}

interface CdpTarget{
    type: string;
    webSocketDebuggerUrl: string;
}

interface CdpReply{
    id?: number;
    method?: string;
    result?: Record<string, string>;
}

const CHROME = process.env.CHROME ?? 'google-chrome';
const PORT = 9333;
const SETTLE_MS = 1500;
const STEP_MS = 450;
const POLL_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const listTargets = async (): Promise<CdpTarget[]> => {
    const body = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.text(), () => '[]');

    return JSON.parse(body);
};

const pageSocketUrl = async (): Promise<string> => {
    for(;;){
        const page = (await listTargets()).find((target) => target.type === 'page');
        if(page) return page.webSocketDebuggerUrl;
        await sleep(POLL_MS);
    }
};

const connect = async (url: string) => {
    const socket = new WebSocket(url);
    await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
    const pending = new Map<number, (reply: CdpReply) => void>();
    const waiting = new Map<string, () => void>();
    let next = 0;
    socket.addEventListener('message', (event) => {
        const reply: CdpReply = JSON.parse(String(event.data));
        if(reply.id !== undefined) pending.get(reply.id)?.(reply);
        if(reply.method) waiting.get(reply.method)?.();
    });

    const send = (method: string, params: object = {}) => new Promise<CdpReply>((resolve) => {
        next += 1;
        pending.set(next, resolve);
        socket.send(JSON.stringify({ id: next, method, params }));
    });
    const once = (method: string) => new Promise<void>((resolve) => waiting.set(method, resolve));

    return { send, once, close: () => socket.close() };
};

const stepScript = (step: string): string => {
    const [kind, ...rest] = step.split(':');
    const arg = JSON.stringify(rest.join(':'));
    const target = `document.querySelector(${arg})`;
    if(kind === 'click') return `${target}.click()`;
    if(kind === 'text') return `[...document.querySelectorAll('button')].find((el) => el.textContent.trim().startsWith(${arg})).click()`;
    if(kind === 'ctx') return `(() => { const el = ${target}; const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 40, clientY: r.top + r.height / 2 })); })()`;
    if(kind === 'key') return `(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: ${arg}, ctrlKey: ${arg} === 'k', bubbles: true }))`;
    if(kind === 'type') return `(() => { const el = document.activeElement; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${arg}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`;

    return rest.join(':');
};

const take = async (cdp: Awaited<ReturnType<typeof connect>>, shot: Shot) => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' }] });
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: shot.url });
    await loaded;
    if(shot.css) await cdp.send('Runtime.evaluate', { expression: `document.head.append(Object.assign(document.createElement('style'), { textContent: ${JSON.stringify(shot.css)} }))` });
    await sleep(SETTLE_MS);
    for(const step of shot.steps ?? []){
        await cdp.send('Runtime.evaluate', { expression: stepScript(step) });
        await sleep(STEP_MS);
    }

    const reply = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(shot.out, Buffer.from(reply.result?.data ?? '', 'base64'));
    console.log(shot.out);
};

const shots: Shot[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shoot-'))}`,
    '--hide-scrollbars',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    'about:blank'
], { stdio: 'ignore' });

const cdp = await connect(await pageSocketUrl());
await cdp.send('Page.enable');
for(const shot of shots){
    await take(cdp, shot);
}
cdp.close();
chrome.kill();
