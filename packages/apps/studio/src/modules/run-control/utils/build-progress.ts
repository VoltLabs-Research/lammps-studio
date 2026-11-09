import { Build, BuildStep } from '@lammps-studio/contracts/build/domain';
import { BuildLine, BuildProgressModel } from '@/modules/run-control/domain/run-control';
import { timeLeftText } from '@/modules/run-control/utils/build-eta';
import { joinDetails } from '@/shared/utils/format';

const lineOf = (step: BuildStep): BuildLine => ({
    name: step.name,
    label: step.detail ? `${step.name} ${step.detail}` : step.name,
    state: step.state
});

const currentStep = (steps: BuildStep[]): BuildStep | null => steps.find((step) => step.state === 'active') ?? steps.find((step) => step.state === 'pending') ?? steps.at(-1) ?? null;

export const buildProgressOf = (build: Build | null, packages: string[], machineName: string, now: number): BuildProgressModel => {
    const sub = [...packages, machineName].join(' · ');
    if(!build) return { sub, progress: 0, now: '', steps: [], output: null };

    const step = currentStep(build.steps);

    return {
        sub,
        progress: build.progress,
        now: joinDetails(step ? lineOf(step).label : null, timeLeftText(build, now)),
        steps: build.steps.map(lineOf),
        output: build.output
    };
};
