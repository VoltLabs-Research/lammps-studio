import Application from '../lib/http/Application';
import BaseController from '../lib/controllers/BaseController';
import RawResponse from '../lib/controllers/responses/Raw';
import { BodyValidator } from '../lib/contracts/params';
import { Body, Param } from '../lib/decorators/controllers/RequestParams';
import { Route } from '../lib/decorators/controllers/Route';
import { Status } from '../lib/decorators/controllers/Status';
import { Discovered } from '../lib/services/ModuleDiscovery';
import { defineErrors } from '../lib/utils/errors/define-errors';
import { del, get, post } from '@lammps-studio/contracts/shared/routing';
import { afterAll, describe, expect, it } from 'vitest';

interface Echo{
    word: string;
}

const TOKEN = 'probe-token';
const SAME_LENGTH_TOKEN = 'probe-tokeN';
const STUDIO_ORIGIN = 'http://localhost:5180';
const ELECTRON_ORIGIN = 'null';
const FOREIGN_ORIGIN = 'https://example.com';
const CREATED = 201;
const RAW_BYTES = Buffer.from([1, 2, 3, 4]);
const OVER_BODY_LIMIT = 1024 * 1024;

const ProbeError = defineErrors({
    domain: 'Probe',
    causes: {
        Gone: 410
    }
});

const probeRoutes = {
    echo: get<Echo>('/probes/:word'),
    create: post<Echo, Echo>('/probes'),
    remove: del('/probes/:word'),
    raw: get<ArrayBuffer>('/probes/raw/bytes'),
    gone: get('/probes/gone/forever'),
    broken: get('/probes/broken/inside')
};

const isEcho = (input: unknown): input is Echo => {
    return typeof input === 'object' && input !== null && 'word' in input && typeof input.word === 'string';
};

const validateEcho: BodyValidator<Echo> = (input) => {
    if(isEcho(input)){
        return {
            success: true,
            data: input
        };
    }

    return {
        success: false,
        data: input,
        errors: [{ path: '$input.word', expected: 'string', value: undefined }]
    };
};

class ProbeController extends BaseController{
    @Route(probeRoutes.echo)
    echo(@Param('word') word: string): Echo{
        return { word };
    }

    @Route(probeRoutes.create)
    @Status(CREATED)
    create(@Body(validateEcho) body: Echo){
        return body;
    }

    @Route(probeRoutes.remove)
    remove(){}

    @Route(probeRoutes.raw)
    raw(){
        return new RawResponse(RAW_BYTES, 'application/octet-stream');
    }

    @Route(probeRoutes.gone)
    gone(){
        throw ProbeError.Gone();
    }

    @Route(probeRoutes.broken)
    broken(){
        throw new TypeError('unexpected');
    }
}

class StrayController extends BaseController{
    @Route(get('/elsewhere'))
    stray(){}
}

const discovered = (Controller: new () => BaseController): Discovered => ({
    controllers: [{ prefix: '/probes', Controller }],
    gateways: []
});

const applicationOf = (Controller: new () => BaseController, onClose?: () => Promise<void>) => new Application({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    corsOrigins: [STUDIO_ORIGIN, ELECTRON_ORIGIN],
    log: { level: 'silent' },
    discover: async () => discovered(Controller),
    onClose
});

const application = applicationOf(ProbeController);
const app = await application.build();
const authorized = { authorization: `Bearer ${TOKEN}` };

describe('Application', () => {
    afterAll(() => application.stop());

    it('refuses a request without the token', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/hello' });

        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ error: 'Request::Unauthorized' });
    });

    it('refuses a request with another token of the same length', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/probes/hello',
            headers: { authorization: `Bearer ${SAME_LENGTH_TOKEN}` }
        });

        expect(res.statusCode).toBe(401);
    });

    it('refuses the token passed in the query string of a plain request', async () => {
        const res = await app.inject({ method: 'GET', url: `/probes/hello?token=${TOKEN}` });

        expect(res.statusCode).toBe(401);
    });

    it('wraps what a handler returns in the data envelope', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/hello', headers: authorized });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ data: { word: 'hello' } });
    });

    it('answers with the status a handler declares', async () => {
        const res = await app.inject({ method: 'POST', url: '/probes', headers: authorized, payload: { word: 'made' } });

        expect(res.statusCode).toBe(CREATED);
        expect(res.json()).toEqual({ data: { word: 'made' } });
    });

    it('answers 204 when a handler returns nothing', async () => {
        const res = await app.inject({ method: 'DELETE', url: '/probes/hello', headers: authorized });

        expect(res.statusCode).toBe(204);
        expect(res.body).toBe('');
    });

    it('sends a raw response as it is', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/raw/bytes', headers: authorized });

        expect(res.headers['content-type']).toBe('application/octet-stream');
        expect(res.rawPayload.equals(RAW_BYTES)).toBe(true);
    });

    it('maps a thrown domain error to its status and code', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/gone/forever', headers: authorized });

        expect(res.statusCode).toBe(410);
        expect(res.json()).toEqual({ error: 'Probe::Gone' });
    });

    it('rejects a body its validator refuses with the field messages', async () => {
        const res = await app.inject({ method: 'POST', url: '/probes', headers: authorized, payload: { other: 1 } });

        expect(res.statusCode).toBe(400);
        expect(res.json()).toEqual({ error: 'Request::ValidationFailed', errors: { word: 'Required' } });
    });

    it.each([
        ['malformed JSON', 'application/json', '{"word":', 400],
        ['an empty JSON body', 'application/json', '', 400],
        ['a body over the size limit', 'application/json', JSON.stringify({ word: 'x'.repeat(OVER_BODY_LIMIT) }), 413],
        ['a media type it does not parse', 'application/xml', '<word/>', 415]
    ])('answers %s with its client status in the error envelope', async (_, contentType, payload, status) => {
        const res = await app.inject({
            method: 'POST',
            url: '/probes',
            headers: { ...authorized, 'content-type': contentType },
            payload
        });

        expect(res.statusCode).toBe(status);
        expect(res.json()).toEqual({ error: 'Request::ValidationFailed', errors: { body: expect.any(String) } });
    });

    it('answers an unexpected failure with 500', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/broken/inside', headers: authorized });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'unexpected' });
    });

    it('lets studio and the electron window through cors', async () => {
        for(const origin of [STUDIO_ORIGIN, ELECTRON_ORIGIN]){
            const res = await app.inject({
                method: 'OPTIONS',
                url: '/probes/hello',
                headers: {
                    origin,
                    'access-control-request-method': 'GET',
                    'access-control-request-headers': 'authorization'
                }
            });

            expect(res.statusCode).toBe(204);
            expect(res.headers['access-control-allow-origin']).toBe(origin);
            expect(res.headers['access-control-allow-headers']).toBe('authorization');
        }
    });

    it('keeps any other origin out', async () => {
        const res = await app.inject({
            method: 'OPTIONS',
            url: '/probes/hello',
            headers: { origin: FOREIGN_ORIGIN, 'access-control-request-method': 'GET' }
        });

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('lets studio read an unauthorized answer', async () => {
        const res = await app.inject({ method: 'GET', url: '/probes/hello', headers: { origin: STUDIO_ORIGIN } });

        expect(res.statusCode).toBe(401);
        expect(res.headers['access-control-allow-origin']).toBe(STUDIO_ORIGIN);
    });

    it('fails the boot when a route lies outside its module prefix', async () => {
        await expect(applicationOf(StrayController).build()).rejects.toThrow('Route::PrefixMismatch:/elsewhere');
    });

    it('runs the close hook when it stops', async () => {
        let closed = false;
        const closing = applicationOf(ProbeController, async () => {
            closed = true;
        });
        await closing.build();

        await closing.stop();

        expect(closed).toBe(true);
    });
});
