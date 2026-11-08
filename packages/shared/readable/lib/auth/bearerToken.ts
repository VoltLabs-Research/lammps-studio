import { RequestError } from '../errors/Request';
import { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import { timingSafeEqual } from 'node:crypto';

const SCHEME = 'Bearer ';
const WEBSOCKET_UPGRADE = 'websocket';

interface TokenQuery{
    token?: string;
}

const presentedToken = (req: FastifyRequest): string => {
    if(req.headers.upgrade?.toLowerCase() === WEBSOCKET_UPGRADE){
        return (req.query as TokenQuery).token ?? '';
    }

    const header = req.headers.authorization;
    if(!header?.startsWith(SCHEME)) return '';

    return header.slice(SCHEME.length);
};

export const bearerToken = (token: string): onRequestAsyncHookHandler => {
    const expected = Buffer.from(token);

    return async (req) => {
        const presented = Buffer.from(presentedToken(req));
        if(presented.length !== expected.length || !timingSafeEqual(presented, expected)){
            throw RequestError.Unauthorized();
        }
    };
};
