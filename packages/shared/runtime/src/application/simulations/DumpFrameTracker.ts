import { readFile } from 'node:fs/promises';

const TIMESTEP_PATTERN = /ITEM:\s+TIMESTEP\s*\n\s*(\d+)/g;

export default class DumpFrameTracker{
    private readonly lastStepsByFile = new Map<string, number>();

    async readNewSteps(filePath: string): Promise<number[]>{
        const content = await readFile(filePath, 'utf8');
        const steps = [...content.matchAll(TIMESTEP_PATTERN)].map((match) => Number(match[1]));
        const newestStep = steps.at(-1);

        if(newestStep === undefined){
            return [];
        }

        const lastSeenStep = this.lastStepsByFile.get(filePath);
        this.lastStepsByFile.set(filePath, newestStep);

        if(lastSeenStep === undefined){
            return steps;
        }

        return steps.filter((step) => step > lastSeenStep);
    }
}
