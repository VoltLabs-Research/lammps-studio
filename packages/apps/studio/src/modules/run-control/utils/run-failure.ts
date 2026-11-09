import { Run } from '@lammps-studio/contracts/run/domain';

export const failedStepOf = (run: Run): number | null => run.error?.step ?? (run.progress.step > 0 ? run.progress.step : null);
