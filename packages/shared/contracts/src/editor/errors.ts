import { ErrorCode, ErrorTable } from '../shared/errors';

export const EditorErrors = {
    domain: 'Editor',
    causes: {
        Unavailable: 503
    }
} as const satisfies ErrorTable;

export type EditorErrorCode = ErrorCode<typeof EditorErrors>;
