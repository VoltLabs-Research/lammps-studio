import { ErrorCode, ErrorTable } from '../shared/errors';

export const MachineErrors = {
    domain: 'Machine',
    causes: {
        NotFound: 404,
        Offline: 503
    }
} as const satisfies ErrorTable;

export type MachineErrorCode = ErrorCode<typeof MachineErrors>;
