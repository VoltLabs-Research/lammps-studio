import StepRate from '../services/StepRate';
import { describe, expect, it } from 'vitest';

describe('StepRate', () => {
    it('has no rate until its samples span a second, then measures steps over that span', () => {
        const rate = new StepRate();

        rate.sample(1, 0, 0);
        rate.sample(1, 400, 500);
        expect(rate.perSecond).toBeNull();

        rate.sample(1, 1000, 1250);
        expect(rate.perSecond).toBe(800);
    });

    it('starts over when a new section begins', () => {
        const rate = new StepRate();
        rate.sample(1, 0, 0);
        rate.sample(1, 500, 1000);

        rate.sample(2, 0, 1100);

        expect(rate.perSecond).toBeNull();
        rate.sample(2, 300, 2100);
        expect(rate.perSecond).toBe(300);
    });

    it('takes a burst of replayed output as one sample, so it does not count it as speed', () => {
        const rate = new StepRate();
        rate.sample(1, 90_000, 0);

        rate.sample(1, 90_100, 1000);

        expect(rate.perSecond).toBe(100);
    });

    it('measures over its recent samples, forgetting a slow start', () => {
        const rate = new StepRate();
        rate.sample(1, 0, 0);
        for(let second = 1; second <= 30; second++){
            rate.sample(1, second <= 5 ? second : 5 + (second - 5) * 100, second * 1000);
        }

        expect(rate.perSecond).toBe(100);
    });
});
