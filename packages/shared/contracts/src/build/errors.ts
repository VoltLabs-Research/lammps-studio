import { ErrorCode, ErrorTable } from '../shared/errors';

export const BuildErrors = {
    domain: 'Build',
    causes: {
        NotFound: 404,
        InUse: 409,
        Failed: 500
    }
} as const satisfies ErrorTable;

export type BuildErrorCode = ErrorCode<typeof BuildErrors>;
