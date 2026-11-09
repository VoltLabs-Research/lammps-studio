import { RateSample } from '../contracts/domain/run';

const MAX_SAMPLES = 20;
const MIN_SPAN_MS = 1000;
const MS_PER_SECOND = 1000;

export default class StepRate{
    #samples: RateSample[] = [];
    #section = 0;
    #perSecond: number | null = null;

    get perSecond(): number | null{
        return this.#perSecond;
    }

    sample(section: number, step: number, at: number){
        if(section !== this.#section){
            this.#section = section;
            this.#samples = [];
            this.#perSecond = null;
        }

        this.#samples = [...this.#samples, { at, step }].slice(-MAX_SAMPLES);
        const [first] = this.#samples;
        const span = at - first.at;
        if(span >= MIN_SPAN_MS) this.#perSecond = (step - first.step) / (span / MS_PER_SECOND);
    }
}
