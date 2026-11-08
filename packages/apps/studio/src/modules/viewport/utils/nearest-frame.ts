import type { FrameInfo } from '@lammps-studio/contracts/run/domain';

export const nearestFrame = (frames: FrameInfo[], step: number): number => {
    let lo = 0;
    let hi = frames.length - 1;

    while(hi - lo > 1){
        const mid = (lo + hi) >> 1;

        if(frames[mid].step <= step){
            lo = mid;
        }else{
            hi = mid;
        }
    }

    return Math.abs(frames[hi].step - step) < Math.abs(frames[lo].step - step) ? hi : lo;
};
