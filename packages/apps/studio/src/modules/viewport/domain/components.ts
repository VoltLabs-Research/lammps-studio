import type { CSSProperties, ReactNode, Ref } from 'react';
import type { Matrix4 } from 'three';
import type { FrameInfo } from '@lammps-studio/contracts/run/domain';
import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { Legend } from '@/modules/viewport/domain/legend';
import type { ColorMode } from '@/modules/viewport/domain/scene';

export interface AtomViewportHandle{
    resetView: () => void;
    snapshot: () => Promise<Blob>;
    atomRadius: () => number | null;
}

export interface AtomViewportProps{
    frame: Frame | null;
    colorMode: ColorMode;
    showBox: boolean;
    showAxes: boolean;
    atomScale: number;
    bottomInset: number;
    children?: ReactNode;
    ref?: Ref<AtomViewportHandle>;
}

export interface StageStyle extends CSSProperties{
    '--bar-h': string;
}

export interface AxesGizmoProps{
    view: Matrix4;
}

export interface AxisArm{
    name: string;
    color: string;
    x: number;
    y: number;
    z: number;
}

export interface ViewportLegendProps{
    legend: Legend;
}

export interface ViewportBarProps{
    step: string;
    meta: string;
    legend: Legend | null;
    onHeight: (height: number) => void;
    children?: ReactNode;
}

export interface FrameRulerProps{
    frames: FrameInfo[];
    index: number;
    startStep: number;
    endStep: number;
    marker: number | null;
    onSeek: (index: number) => void;
}

export interface RulerModel{
    steps: number[];
    index: number;
    startStep: number;
    endStep: number;
    marker: number | null;
}

export type StepScale = (step: number) => number;

export interface RulerPaint{
    context: CanvasRenderingContext2D;
    x: StepScale;
    fg: string;
    muted: string;
    height: number;
}
