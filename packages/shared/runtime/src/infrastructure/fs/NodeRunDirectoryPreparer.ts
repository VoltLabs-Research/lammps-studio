import { copyFile, mkdir, readdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import type { PreparedRun } from '../../domain/simulation/RunSpec';
import type { Logger } from '../../ports/Logger';
import type { RunDirectoryPort } from '../../ports/RunDirectoryPort';

const RUNS_DIR = 'runs';
const RUN_DIR = /^run-(\d+)$/;
const NOT_LINKED = new Set([RUNS_DIR, '.studio']);

const isAlreadyThere = (cause: unknown): boolean => {
    return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'EEXIST';
};

const highestRun = async (runsDir: string): Promise<number> => {
    const numbers = (await readdir(runsDir)).map((name) => Number(RUN_DIR.exec(name)?.[1] ?? 0));
    return Math.max(0, ...numbers);
};

const claimRunDir = async (runsDir: string): Promise<[number, string]> => {
    for(let number = await highestRun(runsDir) + 1; ; number++){
        const dir = path.join(runsDir, `run-${number}`);
        try{
            await mkdir(dir);
            return [number, dir];
        }catch(error){
            if(!isAlreadyThere(error)){
                throw error;
            }
        }
    }
};

export default class NodeRunDirectoryPreparer implements RunDirectoryPort{
    constructor(private readonly logger: Logger){}

    async prepare(simulationDir: string, entry: string): Promise<PreparedRun>{
        const root = path.resolve(simulationDir);
        const runsDir = path.join(root, RUNS_DIR);
        await mkdir(runsDir, { recursive: true });

        const [number, dir] = await claimRunDir(runsDir);
        const entryName = path.basename(entry);
        await copyFile(path.join(root, entry), path.join(dir, entryName));

        const linked = (await readdir(root)).filter((name) => !NOT_LINKED.has(name) && name !== entryName);
        for(const name of linked){
            await symlink(path.relative(dir, path.join(root, name)), path.join(dir, name));
        }

        this.logger.info(`Prepared run ${number}`, { dir, entry: entryName, linked });
        return {
            number,
            dir,
            entry: entryName
        };
    }
}
