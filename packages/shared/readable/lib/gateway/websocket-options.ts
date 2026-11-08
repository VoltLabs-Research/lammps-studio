import { WebsocketPluginOptions } from '@fastify/websocket';

export const MAX_FRAME_BYTES = 1024 * 1024;

export const websocketOptions: WebsocketPluginOptions = {
    options: { maxPayload: MAX_FRAME_BYTES }
};
