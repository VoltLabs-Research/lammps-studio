import ClassMetadata from '../../utils/ClassMetadata';
import { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { RouteDefinition } from '../../contracts/routing';

export const routesByController = new ClassMetadata<RouteDefinition>();

export const Route = <I, O>(route: Endpoint<I, O>): MethodDecorator => {
    return (target, handlerName) => {
        routesByController.append(target.constructor, {
            path: route.path,
            method: route.method,
            handlerName
        });
    };
};
