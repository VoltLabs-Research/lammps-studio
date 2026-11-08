import { EditorError } from '../contracts/domain/errors';
import { EditorProcess, LineHandler } from '../contracts/domain/editor';
import { config } from '@/config';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

const LISTENING = /HTTP server listening on (http:\/\/[^\s/]+)/;
const ANY_FREE_PORT = 0;

const argumentsFor = (folder: string): string[] => [
    '--bind-addr', `${config.host}:${ANY_FREE_PORT}`,
    '--auth', 'none',
    '--disable-telemetry',
    '--disable-update-check',
    '--disable-workspace-trust',
    '--user-data-dir', config.codeServer.userDataDir,
    folder
];

export default class CodeServerService{
    #processes = new Map<string, EditorProcess>();

    open(simulationId: string, folder: string): Promise<string>{
        const running = this.#processes.get(simulationId) ?? this.#start(simulationId, folder);

        return running.ready;
    }

    async closeAll(){
        const children = [...this.#processes.values()].map((editor) => editor.child);

        await Promise.all(children.map(async (child) => {
            if(child.exitCode !== null || child.signalCode !== null) return;

            const exited = once(child, 'exit');
            child.kill();
            await exited;
        }));
    }

    #start(simulationId: string, folder: string): EditorProcess{
        const child = spawn(config.codeServer.command, argumentsFor(folder), { stdio: ['ignore', 'pipe', 'pipe'] });
        const forget = () => {
            if(this.#processes.get(simulationId)?.child === child) this.#processes.delete(simulationId);
        };

        const ready = new Promise<string>((resolve, reject) => {
            const scan = (line: string) => {
                const match = LISTENING.exec(line);
                if(match) resolve(match[1]);
            };
            const fail = (reason: unknown) => {
                logger.info('code-server stopped', { scope: 'editor', simulationId, reason: String(reason) });
                forget();
                reject(EditorError.Unavailable());
            };

            this.#lines(child.stdout, scan);
            this.#lines(child.stderr, scan);
            child.once('error', fail);
            child.once('exit', (code, signal) => fail(signal ?? code));
        });

        const editor: EditorProcess = {
            child,
            ready
        };
        this.#processes.set(simulationId, editor);
        return editor;
    }

    #lines(stream: Readable, onLine: LineHandler){
        createInterface({ input: stream }).on('line', onLine);
    }
}

export const codeServer = new CodeServerService();
