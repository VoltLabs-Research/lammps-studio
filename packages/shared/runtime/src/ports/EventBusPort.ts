export type EventHandler<T> = (payload: T) => void;

export interface EventBusPort<Events extends object>{
    emit<K extends keyof Events & string>(event: K, payload: Events[K]): void;
    on<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): () => void;
    once<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): () => void;
    off<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): void;
}
