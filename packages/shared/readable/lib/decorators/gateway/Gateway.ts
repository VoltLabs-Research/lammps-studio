import ClassMetadata from '../../utils/ClassMetadata';
import { GatewayHandler, GatewayRoute } from '../../contracts/gateway';

export const handlersByGateway = new ClassMetadata<GatewayHandler>();

const on = (route: GatewayRoute): MethodDecorator => {
    return (target, handlerName) => {
        handlersByGateway.append(target.constructor, { ...route, handlerName });
    };
};

export const OnConnect = () => on({ kind: 'connect' });
export const OnDisconnect = () => on({ kind: 'disconnect' });
export const OnMessage = (type: string) => on({ kind: 'message', type });
