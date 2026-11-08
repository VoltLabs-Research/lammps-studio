import FileService from '../services/File';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import RawResponse from '@lammps-studio/readable/controllers/responses/Raw';
import { Param, Query } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { OCTET_STREAM } from '@/shared/http/contentTypes';
import { fileRoutes } from '@lammps-studio/contracts/file/routes';

export default class FileController extends BaseController{
    #service = new FileService();

    @Route(fileRoutes.list)
    list(@Param('simulationId') simulationId: string, @Query('path') path: string | undefined){
        return this.#service.list(simulationId, path);
    }

    @Route(fileRoutes.download)
    async download(@Param('simulationId') simulationId: string, @Query('path') path: string | undefined){
        return new RawResponse(await this.#service.download(simulationId, path), OCTET_STREAM);
    }

    @Route(fileRoutes.remove)
    remove(@Param('simulationId') simulationId: string, @Query('path') path: string | undefined){
        return this.#service.remove(simulationId, path);
    }
}
