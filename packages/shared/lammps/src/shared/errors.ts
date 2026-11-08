import { defineErrors } from './define-errors';

export const DumpErrors = defineErrors('Dump', ['Malformed', 'Unsupported']);

export const FrameErrors = defineErrors('Frame', ['BadMagic', 'Truncated', 'BadHeader']);
