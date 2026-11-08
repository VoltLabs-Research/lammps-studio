export class ClientError extends Error{
    readonly code: string;
    readonly status: number;

    constructor(code: string, status: number, options?: ErrorOptions){
        super(code, options);
        this.name = 'ClientError';
        this.code = code;
        this.status = status;
    }
}
