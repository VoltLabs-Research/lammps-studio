import { DumpErrors } from '../shared/errors';

export default class LineCursor{
    #index = 0;

    constructor(private readonly lines: string[]){}

    get line(): number{
        return this.#index;
    }

    done(): boolean{
        return this.#index >= this.lines.length;
    }

    peek(): string | undefined{
        return this.lines[this.#index];
    }

    next(): string{
        const line = this.lines[this.#index];
        if(line === undefined){
            throw DumpErrors.Malformed(`the dump ends early after line ${this.#index}`);
        }

        this.#index += 1;
        return line;
    }
}
