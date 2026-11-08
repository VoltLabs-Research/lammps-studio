import { app } from 'electron';
import { ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, WriteStream } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { AGENT_READY_PREFIX, AgentEndpoint, AgentReadyMessage } from '@lammps-studio/contracts/desktop/bridge';
import { config } from './config';

const STUDIO_ROOT = 'lammps-studio';
const LOG_FILE = 'agent.log';
const FIRST_RESTART_MS = 1000;
const LAST_RESTART_MS = 30_000;

export default class AgentSupervisor{
    readonly #endpoint: AgentEndpoint;
    readonly #log: WriteStream;
    #agent: ChildProcess | undefined;
    #restarts = 0;
    #restartTimer: NodeJS.Timeout | undefined;
    #stopping = false;

    constructor(endpoint: AgentEndpoint){
        this.#endpoint = endpoint;
        this.#log = createWriteStream(join(app.getPath('logs'), LOG_FILE));
    }

    start(){
        this.#launch();
    }

    stop(){
        this.#stopping = true;
        clearTimeout(this.#restartTimer);
        this.#agent?.kill();
    }

    #launch(){
        const agent = spawn(process.execPath, config.agent.args, {
            cwd: config.agent.cwd,
            env: this.#environment(),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        createInterface({ input: agent.stdout }).on('line', (line) => this.#readLine(line));
        agent.stderr.on('data', (chunk: Buffer) => this.#write(chunk.toString()));
        agent.on('exit', (code, signal) => this.#restartLater(`exited with ${signal ?? code}`));
        this.#agent = agent;
    }

    #environment(): NodeJS.ProcessEnv{
        return {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            LAMMPS_AGENT_PORT: new URL(this.#endpoint.url).port,
            LAMMPS_AGENT_TOKEN: this.#endpoint.token,
            LAMMPS_STUDIO_ROOT: join(app.getPath('home'), STUDIO_ROOT)
        };
    }

    #readLine(line: string){
        if(!line.startsWith(AGENT_READY_PREFIX)){
            this.#write(`${line}\n`);
            return;
        }

        const ready: AgentReadyMessage = JSON.parse(line.slice(AGENT_READY_PREFIX.length));
        this.#restarts = 0;
        this.#note(`lammps-agent ${ready.version} is ready on ${ready.url}`);
    }

    #restartLater(reason: string){
        if(this.#stopping) return;

        const delay = Math.min(FIRST_RESTART_MS * 2 ** this.#restarts, LAST_RESTART_MS);
        this.#restarts += 1;
        this.#note(`lammps-agent ${reason}, restarting in ${delay} ms`);
        this.#restartTimer = setTimeout(() => this.#launch(), delay);
    }

    #note(message: string){
        this.#write(`${new Date().toISOString()} ${message}\n`);
    }

    #write(text: string){
        this.#log.write(text);
        if(!app.isPackaged) process.stdout.write(text);
    }
}
