import { Build } from '../build/domain';
import { Machine } from '../machine/domain';
import { FrameInfo, LogLine, Run } from '../run/domain';
import { Simulation } from '../simulation/domain';

export const EVENTS_CHANNEL = '/events';

export interface SimulationUpdatedFrame{
    type: 'simulation:updated';
    simulation: Simulation;
}

export interface SimulationRemovedFrame{
    type: 'simulation:removed';
    simulationId: string;
}

export interface RunUpdatedFrame{
    type: 'run:updated';
    run: Run;
}

export interface RunLogFrame{
    type: 'run:log';
    simulationId: string;
    runNumber: number;
    lines: LogLine[];
}

export interface RunThermoFrame{
    type: 'run:thermo';
    simulationId: string;
    runNumber: number;
    section: number;
    columns: string[];
    rows: number[][];
}

export interface RunFrameFrame{
    type: 'run:frame';
    simulationId: string;
    runNumber: number;
    frame: FrameInfo;
}

export interface BuildUpdatedFrame{
    type: 'build:updated';
    build: Build;
}

export interface MachineUpdatedFrame{
    type: 'machine:updated';
    machine: Machine;
}

export type StudioEvent =
    | SimulationUpdatedFrame
    | SimulationRemovedFrame
    | RunUpdatedFrame
    | RunLogFrame
    | RunThermoFrame
    | RunFrameFrame
    | BuildUpdatedFrame
    | MachineUpdatedFrame;

export type StudioEventType = StudioEvent['type'];

export type StudioEventOf<T extends StudioEventType> = Extract<StudioEvent, { type: T }>;
