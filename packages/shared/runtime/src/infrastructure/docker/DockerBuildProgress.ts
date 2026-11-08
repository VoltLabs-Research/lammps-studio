import { BUILD_STAGES, BuildProgress, BuildStage, BuildStep, BuildStepState, stepName } from '../../domain/build/BuildStage';

const DOCKER_STEP = /^Step (\d+)\/\d+ : (.*)$/;
const COMPILE = /^\[\s*(\d+)%\] Building (?:CXX|C|CUDA|Fortran) object /;
const INSTALL = /^-- Install configuration:/;
const DOCKER_NOISE = /^ ---> /;
const FROM = /^FROM\s+(\S+)/;
const PERCENT = 100;

export default class DockerBuildProgress{
    #stage: BuildStage = 'resolve';
    #baseImage: string | null = null;
    #output: string | null = null;
    #compiled = 0;
    #firstPercent: number | null = null;
    #percent = 0;
    #complete = false;

    constructor(
        private readonly stages: BuildStage[],
        private readonly version: string
    ){}

    push(line: string){
        const step = DOCKER_STEP.exec(line);
        if(step){
            this.#enterDockerStep(Number(step[1]), step[2]);
            return;
        }

        if(!DOCKER_NOISE.test(line)){
            this.#output = line;
        }

        const compile = COMPILE.exec(line);
        if(compile && this.#stage === 'compile'){
            this.#compiled += 1;
            this.#percent = Math.max(this.#percent, Number(compile[1]));
            this.#firstPercent ??= this.#percent;
            return;
        }

        if(INSTALL.test(line) && this.#stage === 'compile'){
            this.#stage = 'install';
        }
    }

    complete(){
        this.#complete = true;
    }

    snapshot(): BuildProgress{
        return {
            progress: this.#progress(),
            steps: BUILD_STAGES.map(({ stage }) => this.#step(stage)),
            output: this.#output
        };
    }

    #enterDockerStep(index: number, instruction: string){
        this.#output = instruction;
        this.#baseImage ??= FROM.exec(instruction)?.[1] ?? null;

        const stage = this.stages[index - 1];
        if(stage !== undefined && this.#order(stage) > this.#order(this.#stage)){
            this.#stage = stage;
        }
    }

    #order(stage: BuildStage): number{
        return BUILD_STAGES.findIndex((span) => span.stage === stage);
    }

    #compileFraction(): number{
        if(this.#firstPercent === null || this.#percent <= this.#firstPercent){
            return 0;
        }

        return (this.#percent - this.#firstPercent) / (PERCENT - this.#firstPercent);
    }

    #progress(): number{
        if(this.#complete){
            return 1;
        }

        const span = BUILD_STAGES[this.#order(this.#stage)];
        const fraction = this.#stage === 'compile' ? this.#compileFraction() : 0;

        return span.start + (span.end - span.start) * fraction;
    }

    #step(stage: BuildStage): BuildStep{
        const done = this.#isDone(stage);

        return {
            name: stepName(stage, this.version),
            state: this.#stateOf(stage),
            detail: this.#detail(stage, done)
        };
    }

    #isDone(stage: BuildStage): boolean{
        return this.#complete || this.#order(stage) < this.#order(this.#stage);
    }

    #stateOf(stage: BuildStage): BuildStepState{
        if(this.#isDone(stage)){
            return 'done';
        }

        return stage === this.#stage ? 'active' : 'pending';
    }

    #detail(stage: BuildStage, done: boolean): string | null{
        if(stage === 'pull'){
            return this.#baseImage;
        }

        if(stage !== 'compile' || this.#compiled === 0){
            return null;
        }

        if(done){
            return `${this.#compiled} / ${this.#compiled} files`;
        }

        const fraction = this.#compileFraction();
        if(fraction === 0){
            return `${this.#compiled} files`;
        }

        return `${this.#compiled} / ${Math.max(this.#compiled, Math.round(this.#compiled / fraction))} files`;
    }
}
