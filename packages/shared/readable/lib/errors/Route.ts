import { defineErrors } from '../utils/errors/define-errors';

export const RouteError = defineErrors({
    domain: 'Route',
    causes: {
        PrefixMismatch: 500
    }
});