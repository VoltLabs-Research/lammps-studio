import typia from 'typia';
import RunService from '../services/Run';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import RawResponse from '@lammps-studio/readable/controllers/responses/Raw';
import { Body, Param } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { Status } from '@lammps-studio/readable/decorators/controllers/Status';
import { OCTET_STREAM } from '@/shared/http/contentTypes';
import { StartRunInput, StopRunInput } from '@lammps-studio/contracts/run/http';
import { runRoutes } from '@lammps-studio/contracts/run/routes';

export default class RunController extends BaseController{
    #service = new RunService();

    @Route(runRoutes.list)
    list(@Param('simulationId') simulationId: string){
        return this.#service.list(simulationId);
    }

    @Route(runRoutes.start)
    @Status(201)
    start(
        @Param('simulationId') simulationId: string,
        @Body(typia.misc.createValidatePrune<StartRunInput>()) body: StartRunInput
    ){
        return this.#service.start(simulationId, body.config);
    }

    @Route(runRoutes.get)
    get(@Param('simulationId') simulationId: string, @Param('runNumber') runNumber: string){
        return this.#service.get(simulationId, runNumber);
    }

    @Route(runRoutes.stop)
    stop(
        @Param('simulationId') simulationId: string,
        @Param('runNumber') runNumber: string,
        @Body(typia.misc.createValidatePrune<StopRunInput>()) body: StopRunInput
    ){
        return this.#service.stop(simulationId, runNumber, body.kill);
    }

    @Route(runRoutes.log)
    log(@Param('simulationId') simulationId: string, @Param('runNumber') runNumber: string){
        return this.#service.log(simulationId, runNumber);
    }

    @Route(runRoutes.thermo)
    thermo(@Param('simulationId') simulationId: string, @Param('runNumber') runNumber: string){
        return this.#service.thermo(simulationId, runNumber);
    }

    @Route(runRoutes.frames)
    frames(@Param('simulationId') simulationId: string, @Param('runNumber') runNumber: string){
        return this.#service.frames(simulationId, runNumber);
    }

    @Route(runRoutes.frame)
    async frame(
        @Param('simulationId') simulationId: string,
        @Param('runNumber') runNumber: string,
        @Param('frameIndex') frameIndex: string
    ){
        return new RawResponse(await this.#service.frame(simulationId, runNumber, frameIndex), OCTET_STREAM);
    }
}
