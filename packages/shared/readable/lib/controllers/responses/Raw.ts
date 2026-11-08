import { Readable } from 'node:stream';

export default class RawResponse{
    constructor(
        readonly body: string | Buffer | Readable,
        readonly contentType: string,
        readonly status: number = 200
    ){}
}
