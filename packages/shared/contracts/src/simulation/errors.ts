import { ErrorCode, ErrorTable } from '../shared/errors';

export const SimulationErrors = {
    domain: 'Simulation',
    causes: {
        NotFound: 404,
        NameTaken: 409,
        NoEntryScript: 422,
        EntryOutsideFolder: 400,
        NoPreview: 404
    }
} as const satisfies ErrorTable;

export type SimulationErrorCode = ErrorCode<typeof SimulationErrors>;
