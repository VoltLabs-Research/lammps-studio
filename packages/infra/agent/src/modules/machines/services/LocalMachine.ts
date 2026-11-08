import { config } from '@/config';
import { formatBytes } from '@/shared/utils/formatBytes';
import { isMissing } from '@/shared/utils/fsErrors';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { execFile } from 'node:child_process';
import { readFile, statfs } from 'node:fs/promises';
import { availableParallelism, cpus, hostname, release, totalmem, type } from 'node:os';
import { promisify } from 'node:util';

export const LOCAL_MACHINE_ID = 'local';

const LOCAL_MACHINE_NAME = 'This computer';
const OS_RELEASE = '/etc/os-release';
const OS_RELEASE_FIELD = /^(\w+)=["']?(.*?)["']?$/;
const GPU_LINE = /^GPU \d+:/;
const PROBE_TIMEOUT_MS = 5000;
const DOCKER_UNAVAILABLE = 'Docker unavailable';

const execFileAsync = promisify(execFile);

export default class LocalMachineService{
    async describe(): Promise<Machine>{
        const [os, gpus, runtime, diskFree] = await Promise.all([
            this.#os(),
            this.#gpus(),
            this.#runtime(),
            this.#diskFree()
        ]);

        return {
            id: LOCAL_MACHINE_ID,
            name: LOCAL_MACHINE_NAME,
            kind: 'local',
            status: 'online',
            host: hostname(),
            os,
            cpu: cpus()[0].model.trim(),
            cores: availableParallelism(),
            memory: formatBytes(totalmem()),
            gpus,
            runtime,
            scheduler: null,
            agentVersion: config.version,
            root: config.simulationsDir,
            diskFree,
            offlineSince: null
        };
    }

    async #os(): Promise<string>{
        let raw: string;
        try{
            raw = await readFile(OS_RELEASE, 'utf8');
        }catch(error: unknown){
            if(isMissing(error)) return `${type()} ${release()}`;
            throw error;
        }

        const fields = new Map<string, string>();
        for(const line of raw.split('\n')){
            const match = OS_RELEASE_FIELD.exec(line.trim());
            if(match) fields.set(match[1], match[2]);
        }

        return [fields.get('NAME'), fields.get('VERSION_ID')]
            .filter((part) => part !== undefined)
            .join(' ');
    }

    async #gpus(): Promise<number>{
        try{
            const { stdout } = await execFileAsync('nvidia-smi', ['-L'], { timeout: PROBE_TIMEOUT_MS });
            return stdout.split('\n').filter((line) => GPU_LINE.test(line)).length;
        }catch{
            return 0;
        }
    }

    async #runtime(): Promise<string>{
        try{
            const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: PROBE_TIMEOUT_MS });
            return `Docker ${stdout.trim()}`;
        }catch{
            return DOCKER_UNAVAILABLE;
        }
    }

    async #diskFree(): Promise<string>{
        const disk = await statfs(config.simulationsDir);
        return formatBytes(disk.bavail * disk.bsize);
    }
}
