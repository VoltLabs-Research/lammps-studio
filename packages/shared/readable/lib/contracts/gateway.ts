export interface InboundFrame{
    type: string;
    [field: string]: unknown;
}

export interface OutboundFrame{
    type: string;
}

export interface OutboundMessage<T> extends OutboundFrame{
    data: T;
}

export type GatewayLifecycle = 'connect' | 'disconnect';

interface MessageRoute{
    kind: 'message';
    type: string;
}

interface LifecycleRoute{
    kind: GatewayLifecycle;
}

export type GatewayRoute = MessageRoute | LifecycleRoute;

export type GatewayHandler = GatewayRoute & {
    handlerName: string | symbol;
};
