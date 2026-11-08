import BaseGateway from '@lammps-studio/readable/gateway/BaseGateway';
import { Channel } from '@lammps-studio/readable/decorators/gateway/Channel';
import { EVENTS_CHANNEL } from '@lammps-studio/contracts/events/gateway';
import { eventBus } from '@/shared/events/EventBus';

@Channel(EVENTS_CHANNEL)
export default class EventsGateway extends BaseGateway{
    constructor(){
        super();

        eventBus.on((event) => this.connections.broadcast(event));
    }
}
