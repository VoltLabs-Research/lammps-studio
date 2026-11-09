import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import RuntimeError from '../errors/RuntimeError';
import ValidationError from '../errors/Validation';
import BaseGateway from '../gateway/BaseGateway';
import { ApiError } from '@lammps-studio/contracts/shared/http';
import { HttpMethod } from '@lammps-studio/contracts/shared/routing';
import { bearerToken } from '../auth/bearerToken';
import { LogLevel } from '../contracts/logging';
import { websocketOptions } from '../gateway/websocket-options';
import { Discovered, MountedController } from '../services/ModuleDiscovery';
import { RequestError } from '../errors/Request';
import { logger } from '../utils/Logger';
import Fastify, { LogController, FastifyError, FastifyInstance, FastifyBaseLogger } from 'fastify';

export interface ApplicationLog{
    level: string;
}

export interface ApplicationOptions{
    host: string;
    port: number;
    token: string;
    corsOrigins: string[];
    log: ApplicationLog;
    discover: () => Promise<Discovered>;
    beforeMount?: () => Promise<void>;
    onClose?: () => Promise<void>;
}

const CORS_METHODS: HttpMethod[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CLIENT_ERROR = 400;
const SERVER_ERROR = 500;
const INTERNAL = 'Internal Server Error';

interface FastifyClientError extends FastifyError{
    statusCode: number;
}

const isFastifyClientError = (error: unknown): error is FastifyClientError => {
    if(!(error instanceof Error) || !('statusCode' in error) || typeof error.statusCode !== 'number') return false;

    return error.statusCode >= CLIENT_ERROR && error.statusCode < SERVER_ERROR;
};

const toRuntimeError = (error: unknown): RuntimeError => {
    if(error instanceof RuntimeError) return error;
    if(isFastifyClientError(error)){
        return new ValidationError({ body: error.message }, new RuntimeError(RequestError.ValidationFailed().message, error.statusCode));
    }

    return new RuntimeError(error instanceof Error ? error.message : INTERNAL, SERVER_ERROR);
};

export default class Application{
    #app: FastifyInstance | undefined;
    #options: ApplicationOptions;

    constructor(options: ApplicationOptions){
        this.#options = options;
    }

    async build(): Promise<FastifyInstance>{
        logger.configure({ level: this.#options.log.level as LogLevel });
        const app = Fastify({
            loggerInstance: logger.raw as FastifyBaseLogger,
            logController: new LogController({ disableRequestLogging: true })
        });
        this.#app = app;

        await app.register(cors, {
            origin: this.#options.corsOrigins,
            methods: CORS_METHODS
        });
        await app.register(websocket, websocketOptions);
        app.addHook('onRequest', bearerToken(this.#options.token));
        if(this.#options.onClose) app.addHook('onClose', this.#options.onClose);

        await this.#options.beforeMount?.();
        const discovered = await this.#options.discover();

        this.#registerErrorHandler(app);
        this.#registerRequestLogging(app);
        await this.#mountControllers(app, discovered.controllers);
        this.#mountGateways(app, discovered.gateways);

        return app;
    }

    async start(): Promise<string>{
        const app = await this.build();
        return app.listen({ port: this.#options.port, host: this.#options.host });
    }

    async stop(){
        await this.#app?.close();
    }

    #registerErrorHandler(app: FastifyInstance){
        app.setErrorHandler((err, req, reply) => {
            const error = toRuntimeError(err);

            if(error.statusCode >= SERVER_ERROR){
                logger.error(`${req.method} ${req.url}`, err, { scope: 'http', statusCode: error.statusCode });
            }

            const payload: ApiError = { error: error.message };
            if(error instanceof ValidationError) payload.errors = error.errors;

            reply.status(error.statusCode).send(payload);
        });
    }

    #registerRequestLogging(app: FastifyInstance){
        app.addHook('onResponse', (req, reply, done) => {
            logger.debug(`${req.method} ${req.url}`, {
                scope: 'http',
                statusCode: reply.statusCode,
                ms: Math.round(reply.elapsedTime)
            });
            done();
        });
    }

    async #mountControllers(app: FastifyInstance, controllers: MountedController[]){
        for(const { prefix, Controller } of controllers){
            await new Controller().register(app, prefix);
        }
    }

    #mountGateways(app: FastifyInstance, gateways: Array<new () => BaseGateway>){
        for(const Gateway of gateways){
            new Gateway().register(app);
        }
    }
}
