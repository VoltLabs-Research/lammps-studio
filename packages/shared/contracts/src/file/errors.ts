import { ErrorCode, ErrorTable } from '../shared/errors';

export const FileErrors = {
    domain: 'File',
    causes: {
        NotFound: 404,
        OutsideFolder: 400
    }
} as const satisfies ErrorTable;

export type FileErrorCode = ErrorCode<typeof FileErrors>;
