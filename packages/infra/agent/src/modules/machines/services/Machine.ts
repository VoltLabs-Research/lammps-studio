import LocalMachineService, { LOCAL_MACHINE_ID } from './LocalMachine';
import { MachineError } from '../contracts/domain/errors';
import { Machine } from '@lammps-studio/contracts/machine/domain';

export default class MachineService{
    #local = new LocalMachineService();

    async list(): Promise<Machine[]>{
        return [await this.#local.describe()];
    }

    async get(machineId: string): Promise<Machine>{
        if(machineId !== LOCAL_MACHINE_ID) throw MachineError.NotFound();

        return this.#local.describe();
    }
}
