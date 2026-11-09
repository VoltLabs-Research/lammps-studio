import { RUN_FILE, SCREEN_FILE } from '@/modules/simulations/utils/layout';
import { readTextIfExists } from '@/shared/utils/fsErrors';
import { writeFileAtomic } from '@/shared/utils/writeFileAtomic';
import { LogLine, Run } from '@lammps-studio/contracts/run/domain';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const JSON_INDENT = 4;

export default class RunFiles{
    constructor(private readonly runDir: string){}

    async save(run: Run){
        await writeFileAtomic(join(this.runDir, RUN_FILE), `${JSON.stringify(run, null, JSON_INDENT)}\n`);
    }

    async append(lines: LogLine[]){
        await appendFile(join(this.runDir, SCREEN_FILE), lines.map((line) => `${line.text}\n`).join(''));
    }

    async screen(): Promise<string>{
        return (await readTextIfExists(join(this.runDir, SCREEN_FILE))) ?? '';
    }
}
