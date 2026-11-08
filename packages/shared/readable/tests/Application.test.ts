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

const STUDIO_ORIGIN = 'http://localhost:5180';
const ELECTRON_ORIGIN = 'null';
const FOREIGN_ORIGIN = 'https://example.com';
const CREATED = 201;
const RAW_BYTES = Buffer.from([1, 2, 3, 4]);

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
    gone: get('/probes/gone/forever')
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
    corsOrigins: [STUDIO_ORIGIN, ELECTRON_ORIGIN],
    log: { level: 'silent' },
    discover: async () => discovered(Controller),
    onClose
});

const application = applicationOf(ProbeController);
const app = await application.build();
const authorized = {};

describe('Application', () => {
    afterAll(() => application.stop());

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
