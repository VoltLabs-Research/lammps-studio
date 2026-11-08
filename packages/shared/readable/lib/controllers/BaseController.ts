import RawResponse from './responses/Raw';
import { Handler } from '../contracts/routing';
import { getParamResolvers } from '../decorators/controllers/Params';
import { routesByController } from '../decorators/controllers/Route';
import { getStatus } from '../decorators/controllers/Status';
import { RouteError } from '../errors/Route';
import { FastifyInstance } from 'fastify';

export default abstract class BaseController{
    async register(app: FastifyInstance, prefix: string){
        const mount = async (scope: FastifyInstance) => {
            for(const route of routesByController.get(this.constructor)){
                scope.route({
                    method: route.method,
                    url: this.#relativeTo(route.path, prefix),
                    handler: this.#wrap(route.handlerName)
                });
            }
        };

        await app.register(mount, { prefix });
    }

    #relativeTo(path: string, prefix: string){
        if(path !== prefix && !path.startsWith(`${prefix}/`)){
            throw RouteError.PrefixMismatch(path);
        }
        return path.slice(prefix.length) || '/';
    }

    #wrap(handlerName: string | symbol): Handler{
        const method = (Reflect.get(this, handlerName) as (...args: unknown[]) => unknown).bind(this);
        const override = getStatus(this.constructor, handlerName);
        const resolvers = getParamResolvers(this.constructor, handlerName);

        return async (req, reply) => {
            const boxes = await Promise.all(Array.from(resolvers, async (resolve) => {
                const arg = resolve === undefined ? undefined : resolve(req, reply);
                return { arg: arg instanceof Promise ? await arg : arg };
            }));
            const result = await method(...boxes.map((box) => box.arg));

            if(reply.sent) return;

            if(result instanceof RawResponse){
                return reply
                    .status(override ?? result.status)
                    .type(result.contentType)
                    .send(result.body);
            }

            if(result === undefined || result === null){
                return reply.status(override ?? 204).send();
            }

            return reply.status(override ?? 200).send({ data: result });
        };
    }
}
