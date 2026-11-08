import { ClientError } from '@/shared/errors/ClientError';
import { errorCopy } from '@/shared/utils/error-copy';
import { describe, expect, it } from 'vitest';

describe('errorCopy', () => {
    const copy = errorCopy({
        'Simulation::NameTaken': 'Pick another name.'
    });

    it('prefers the module table', () => {
        expect(copy(new ClientError('Simulation::NameTaken', 409))).toBe('Pick another name.');
    });

    it('falls back to the shared table', () => {
        expect(copy(new ClientError('Agent::Unreachable', 0))).toBe('Studio can’t reach the agent.');
    });

    it('matches on the base code when a detail follows it', () => {
        expect(copy(new Error('Simulation::NameTaken:cu-wire'))).toBe('Pick another name.');
    });

    it('shows an unknown code as it is', () => {
        expect(copy(new ClientError('Run::FrameNotFound', 404))).toBe('Run::FrameNotFound');
    });
});
