import { describe, expect, it } from 'vitest';
import { isDockerAlreadyStopped, isDockerConflict, isDockerUnreachable } from '../src/domain/shared/toError';

const dockerError = (statusCode: number): Error => Object.assign(new Error(`(HTTP code ${statusCode})`), { statusCode });

const systemError = (code: string, syscall: string): Error => Object.assign(new Error(`${syscall} ${code}`), { code, syscall });

describe('Docker errors', () => {
    it.each([
        [304, true],
        [404, true],
        [409, false],
        [500, false]
    ])('takes HTTP %i from a stop as a container that already stopped: %s', (status, stopped) => {
        expect(isDockerAlreadyStopped(dockerError(status))).toBe(stopped);
    });

    it.each([
        [systemError('ENOENT', 'connect'), true],
        [systemError('ECONNREFUSED', 'connect'), true],
        [systemError('EACCES', 'connect'), true],
        [systemError('ENOENT', 'open'), false],
        [dockerError(500), false]
    ])('tells a daemon it cannot reach: %s', (error, unreachable) => {
        expect(isDockerUnreachable(error)).toBe(unreachable);
    });

    it('tells a conflict, such as an image a container still uses', () => {
        expect(isDockerConflict(dockerError(409))).toBe(true);
        expect(isDockerConflict(dockerError(404))).toBe(false);
    });
});
