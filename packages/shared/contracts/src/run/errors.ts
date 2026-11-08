import { ErrorCode, ErrorTable } from '../shared/errors';

export const RunErrors = {
    domain: 'Run',
    causes: {
        NotFound: 404,
        AlreadyRunning: 409,
        NotRunning: 409,
        FrameNotFound: 404
    }
} as const satisfies ErrorTable;

export type RunErrorCode = ErrorCode<typeof RunErrors>;
