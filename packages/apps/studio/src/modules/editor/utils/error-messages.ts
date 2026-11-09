import type { EditorErrorCode } from '@lammps-studio/contracts/editor/errors';
import { errorCopy } from '@/shared/utils/error-copy';

export const editorErrorCopy = errorCopy<EditorErrorCode>({
    'Editor::Unavailable': 'code-server didn’t start on this machine.'
});
