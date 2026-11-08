import SimulationService from '../services/Simulation';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import RawResponse from '@lammps-studio/readable/controllers/responses/Raw';
import { Body, Param } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { Status } from '@lammps-studio/readable/decorators/controllers/Status';
import { OCTET_STREAM } from '@/shared/http/contentTypes';
import { CreateSimulationInput, UpdateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';

export default class SimulationController extends BaseController{
    #service = new SimulationService();

    @Route(simulationRoutes.list)
    list(){
        return this.#service.list();
    }

    @Route(simulationRoutes.create)
    @Status(201)
    create(@Body() body: CreateSimulationInput){
        return this.#service.create(body);
    }

    @Route(simulationRoutes.get)
    get(@Param('simulationId') simulationId: string){
        return this.#service.get(simulationId);
    }

    @Route(simulationRoutes.update)
    update(@Param('simulationId') simulationId: string, @Body() body: UpdateSimulationInput){
        return this.#service.update(simulationId, body);
    }

    @Route(simulationRoutes.remove)
    remove(@Param('simulationId') simulationId: string){
        return this.#service.remove(simulationId);
    }

    @Route(simulationRoutes.duplicate)
    @Status(201)
    duplicate(@Param('simulationId') simulationId: string){
        return this.#service.duplicate(simulationId);
    }

    @Route(simulationRoutes.entryCandidates)
    entryCandidates(@Param('simulationId') simulationId: string){
        return this.#service.entryCandidates(simulationId);
    }

    @Route(simulationRoutes.preview)
    async preview(@Param('simulationId') simulationId: string){
        return new RawResponse(await this.#service.preview(simulationId), OCTET_STREAM);
    }
}
