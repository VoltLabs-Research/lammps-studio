export default class LammpsRuntimeError extends Error{
    readonly code: string;

    constructor(code: string){
        super(code);
        this.name = 'LammpsRuntimeError';
        this.code = code;
    }
}
