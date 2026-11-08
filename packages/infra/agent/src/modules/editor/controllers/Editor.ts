import EditorService from '../services/Editor';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import { Param } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { editorRoutes } from '@lammps-studio/contracts/editor/routes';

export default class EditorController extends BaseController{
    #service = new EditorService();

    @Route(editorRoutes.open)
    open(@Param('simulationId') simulationId: string){
        return this.#service.open(simulationId);
    }
}
