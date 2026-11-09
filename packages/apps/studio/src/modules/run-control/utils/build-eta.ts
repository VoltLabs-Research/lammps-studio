import { Build } from '@lammps-studio/contracts/build/domain';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export const buildMinutesLeft = (build: Build, now: number): number | null => {
    if(build.progress <= 0 || build.progress >= 1) return null;

    const elapsed = Math.max(0, (now - Date.parse(build.createdAt)) / MS_PER_SECOND);
    const remaining = (elapsed * (1 - build.progress)) / build.progress;

    return Math.max(1, Math.round(remaining / SECONDS_PER_MINUTE));
};

export const timeLeftText = (build: Build, now: number): string | null => {
    const minutes = buildMinutesLeft(build, now);

    return minutes === null ? null : `about ${minutes} min left`;
};
