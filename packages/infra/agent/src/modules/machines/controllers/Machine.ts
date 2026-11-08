import MachineService from '../services/Machine';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import { Param } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { machineRoutes } from '@lammps-studio/contracts/machine/routes';

export default class MachineController extends BaseController{
    #service = new MachineService();

    @Route(machineRoutes.list)
    list(){
        return this.#service.list();
    }

    @Route(machineRoutes.get)
    get(@Param('machineId') machineId: string){
        return this.#service.get(machineId);
    }
}
