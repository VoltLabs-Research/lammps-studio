import typia from 'typia';
import BaseController from '@lammps-studio/readable/controllers/BaseController';
import { builds } from '../services/Build';
import { Body, Param } from '@lammps-studio/readable/decorators/controllers/RequestParams';
import { Route } from '@lammps-studio/readable/decorators/controllers/Route';
import { Status } from '@lammps-studio/readable/decorators/controllers/Status';
import { CreateBuildInput } from '@lammps-studio/contracts/build/http';
import { buildRoutes } from '@lammps-studio/contracts/build/routes';

export default class BuildController extends BaseController{
    @Route(buildRoutes.list)
    list(){
        return builds.list();
    }

    @Route(buildRoutes.create)
    @Status(201)
    create(@Body(typia.misc.createValidatePrune<CreateBuildInput>()) body: CreateBuildInput){
        return builds.create(body);
    }

    @Route(buildRoutes.get)
    get(@Param('hash') hash: string){
        return builds.get(hash);
    }

    @Route(buildRoutes.remove)
    remove(@Param('hash') hash: string){
        return builds.remove(hash);
    }
}
