import RuntimeError from '../lib/errors/RuntimeError';
import { defineErrors } from '../lib/utils/errors/define-errors';
import { describe, expect, it } from 'vitest';

const TestError = defineErrors({
    domain: 'Test',
    causes: {
        NotFound: 404,
        Broken: 500
    }
});

describe('defineErrors', () => {
    it('binds each cause to a RuntimeError factory with its status', () => {
        const error = TestError.NotFound();

        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toBe('Test::NotFound');
        expect(error.statusCode).toBe(404);
    });

    it('appends the optional detail as a runtime suffix', () => {
        expect(TestError.Broken('DISK').message).toBe('Test::Broken:DISK');
    });

    it('builds a fresh error per call', () => {
        expect(TestError.NotFound()).not.toBe(TestError.NotFound());
    });
});
