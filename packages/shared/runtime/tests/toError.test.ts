import { describe, expect, it } from 'vitest';
import { isDockerAlreadyStopped } from '../src/domain/shared/toError';

const dockerError = (statusCode: number): Error => Object.assign(new Error(`(HTTP code ${statusCode})`), { statusCode });

describe('Docker errors', () => {
    it.each([
        [304, true],
        [404, true],
        [409, false],
        [500, false]
    ])('takes HTTP %i from a stop as a container that already stopped: %s', (status, stopped) => {
        expect(isDockerAlreadyStopped(dockerError(status))).toBe(stopped);
    });
});
