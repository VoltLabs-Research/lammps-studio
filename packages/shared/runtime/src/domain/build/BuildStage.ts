export type BuildStage = 'resolve' | 'pull' | 'toolchain' | 'clone' | 'configure' | 'compile' | 'install';

export type BuildStepState = 'done' | 'active' | 'pending';

export interface BuildStep{
    name: string;
    state: BuildStepState;
    detail: string | null;
}

export interface BuildProgress{
    progress: number;
    steps: BuildStep[];
    output: string | null;
}

export interface BuildStageSpan{
    stage: BuildStage;
    start: number;
    end: number;
}

export const BUILD_STAGES: BuildStageSpan[] = [
    { stage: 'resolve', start: 0, end: 0.03 },
    { stage: 'pull', start: 0.03, end: 0.08 },
    { stage: 'toolchain', start: 0.08, end: 0.18 },
    { stage: 'clone', start: 0.18, end: 0.26 },
    { stage: 'configure', start: 0.26, end: 0.32 },
    { stage: 'compile', start: 0.32, end: 0.96 },
    { stage: 'install', start: 0.96, end: 1 }
];

export const stepName = (stage: BuildStage, version: string): string => {
    const names: Record<BuildStage, string> = {
        resolve: 'Resolve the build',
        pull: 'Pull the base image',
        toolchain: 'Install compilers and OpenMPI',
        clone: `Clone LAMMPS ${version}`,
        configure: 'Configure with CMake',
        compile: 'Compile',
        install: 'Install lmp'
    };

    return names[stage];
};
