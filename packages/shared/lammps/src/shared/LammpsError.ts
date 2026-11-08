export default class LammpsError extends Error{
    readonly code: string;

    constructor(code: string){
        super(code);
        this.name = 'LammpsError';
        this.code = code;
    }
}
