import { OutboundFrame } from '../contracts/gateway';
import { WebSocket } from '@fastify/websocket';

export default class ConnectionsRegistry{
    #sockets = new Set<WebSocket>();

    add(socket: WebSocket){
        this.#sockets.add(socket);
    }

    remove(socket: WebSocket){
        this.#sockets.delete(socket);
    }

    broadcast(frame: OutboundFrame){
        const raw = JSON.stringify(frame);
        for(const socket of this.#sockets) socket.send(raw);
    }

    get size(): number{
        return this.#sockets.size;
    }
}
