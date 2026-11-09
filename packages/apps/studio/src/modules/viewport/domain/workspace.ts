import type { FrameInfo, Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ColorMode } from '@/modules/viewport/domain/scene';

export interface FrameCursor{
    position: number;
    live: boolean;
}

export interface FrameSpan{
    count: number;
    running: boolean;
}

export interface FrameTarget{
    simulationId: string;
    runNumber: number;
    frame: FrameInfo;
}

export interface DisplaySettings{
    colorMode: ColorMode;
    showBox: boolean;
    showAxes: boolean;
    atomScale: number;
}

export interface ViewedFrames{
    frames: FrameInfo[];
    position: number;
    following: boolean;
    run: Run | null;
    thermo: ThermoSection[];
}

export interface BarInfo{
    step: string;
    meta: string;
}

export interface RulerSpan{
    startStep: number;
    endStep: number;
}
