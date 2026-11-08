import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import RuntimeError from '../errors/RuntimeError';
import ValidationError from '../errors/Validation';
import BaseGateway from '../gateway/BaseGateway';
import { ApiError } from '@lammps-studio/contracts/shared/http';
import { HttpMethod } from '@lammps-studio/contracts/shared/routing';
import { LogLevel } from '../contracts/logging';
import { websocketOptions } from '../gateway/websocket-options';
import { Discovered, MountedController } from '../services/ModuleDiscovery';
import { logger } from '../utils/Logger';
import Fastify, { LogController, FastifyInstance, FastifyBaseLogger } from 'fastify';

export interface ApplicationLog{
    level: string;
}

export interface ApplicationOptions{
    host: string;
    port: number;
    corsOrigins: string[];
    log: ApplicationLog;
    discover: () => Promise<Discovered>;
    beforeMount?: () => Promise<void>;
    onClose?: () => Promise<void>;
}

const CORS_METHODS: HttpMethod[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

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
            const status = err instanceof RuntimeError ? err.statusCode : 500;
            const message = err instanceof Error ? err.message : 'Internal Server Error';

            if(status >= 500){
                logger.error(`${req.method} ${req.url}`, err, { scope: 'http', statusCode: status });
            }

            const payload: ApiError = { error: message };
            if(err instanceof ValidationError) payload.errors = err.errors;

            reply.status(status).send(payload);
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
