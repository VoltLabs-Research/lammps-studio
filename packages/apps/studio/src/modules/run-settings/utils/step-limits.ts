export type StepLimit = readonly [number, number];

export const STEP_LIMITS = {
    mpiRanks: [1, 64],
    threadsPerRank: [1, 16],
    nodes: [1, 64]
} as const satisfies Record<string, StepLimit>;
