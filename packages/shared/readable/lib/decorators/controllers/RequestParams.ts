import { BodyValidator } from '../../contracts/params';
import { parseBody } from '../../utils/controllers/parse-body';
import { createParamDecorator } from './Params';

export const Body = <T>(validate?: BodyValidator<T>): ParameterDecorator =>
    createParamDecorator((req) => validate ? parseBody(validate, req.body) : req.body);

export const Param = (name: string): ParameterDecorator =>
    createParamDecorator((req) => (req.params as Record<string, string>)[name]);

export const Query = (name: string): ParameterDecorator =>
    createParamDecorator((req) => (req.query as Record<string, string>)[name]);
