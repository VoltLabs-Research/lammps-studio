import { StudioEvent } from '@lammps-studio/contracts/events/gateway';

export type StudioEventListener = (event: StudioEvent) => void;

class EventBus{
    #listeners = new Set<StudioEventListener>();

    emit(event: StudioEvent){
        for(const listener of this.#listeners){
            listener(event);
        }
    }

    on(listener: StudioEventListener){
        this.#listeners.add(listener);
    }
}

export const eventBus = new EventBus();
