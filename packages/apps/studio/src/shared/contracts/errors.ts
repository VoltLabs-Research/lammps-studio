import { BuildErrorCode } from '@lammps-studio/contracts/build/errors';
import { FileErrorCode } from '@lammps-studio/contracts/file/errors';
import { MachineErrorCode } from '@lammps-studio/contracts/machine/errors';
import { RunErrorCode } from '@lammps-studio/contracts/run/errors';
import { ErrorCode, ErrorTable, GatewayErrorCode, RequestErrorCode } from '@lammps-studio/contracts/shared/errors';
import { SimulationErrorCode } from '@lammps-studio/contracts/simulation/errors';

export const AgentErrors = {
    domain: 'Agent',
    causes: {
        NotConfigured: 0,
        Unreachable: 0,
        UnexpectedResponse: 502,
        MissingPathParam: 0
    }
} as const satisfies ErrorTable;

export type AgentErrorCode = ErrorCode<typeof AgentErrors>;

export const UiErrors = {
    domain: 'Ui',
    causes: {
        OutsideModalRoot: 0
    }
} as const satisfies ErrorTable;

export type UiErrorCode = ErrorCode<typeof UiErrors>;

export type StudioErrorCode =
    | AgentErrorCode
    | BuildErrorCode
    | FileErrorCode
    | GatewayErrorCode
    | MachineErrorCode
    | RequestErrorCode
    | RunErrorCode
    | SimulationErrorCode
    | UiErrorCode;

export type ErrorMessages<C extends StudioErrorCode> = Partial<Record<C, string>>;
