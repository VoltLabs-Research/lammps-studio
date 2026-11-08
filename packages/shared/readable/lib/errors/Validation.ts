import RuntimeError from './RuntimeError';
import { RequestError } from './Request';

export default class ValidationError extends RuntimeError{
    constructor(
        readonly errors: Record<string, string>, 
        template: RuntimeError = RequestError.ValidationFailed()
    ){
        super(template.message, template.statusCode);
    }
}
