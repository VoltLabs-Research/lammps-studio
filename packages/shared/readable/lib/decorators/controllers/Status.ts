import ClassMetadata from '../../utils/ClassMetadata';
import { StatusBinding } from '../../contracts/routing';

const statusByHandler = new ClassMetadata<StatusBinding>();

export const Status = (code: number): MethodDecorator => {
    return (target, handlerName) => {
        statusByHandler.append(target.constructor, { handlerName, code });
    };
};

export const getStatus = (
    ctor: object, 
    handlerName: string | symbol
): number | undefined => {
    return statusByHandler
        .get(ctor)
        .find((binding) => binding.handlerName === handlerName)?.code;
};
