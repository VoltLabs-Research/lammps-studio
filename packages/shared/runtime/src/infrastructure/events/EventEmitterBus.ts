import EventEmitter from 'eventemitter3';
import { EventBusPort, EventHandler } from '../../ports/EventBusPort';

export default class EventEmitterBus<Events extends object> implements EventBusPort<Events>{
    private readonly emitter = new EventEmitter();

    emit<K extends keyof Events & string>(event: K, payload: Events[K]){
        this.emitter.emit(event, payload);
    }

    on<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): () => void{
        this.emitter.on(event, handler);
        return () => this.off(event, handler);
    }

    once<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): () => void{
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            handler(payload);
        });

        return unsubscribe;
    }

    off<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>){
        this.emitter.off(event, handler);
    }
}
