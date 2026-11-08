import { Endpoint, HttpMethod } from '@lammps-studio/contracts/shared/routing';
import { ErrorTable } from '@lammps-studio/contracts/shared/errors';

export type Params = Record<string, string>;

export class Failure{
    readonly code: string;
    readonly status: number;

    constructor(code: string, status: number){
        this.code = code;
        this.status = status;
    }
}

export interface Route{
    method: HttpMethod;
    pattern: RegExp;
    names: string[];
    handle: (params: Params, rawBody: string) => unknown;
}

export interface RouteMatch{
    route: Route;
    params: Params;
}

const PARAM = /:(\w+)/g;

export const fail = <T extends ErrorTable>(table: T, cause: Extract<keyof T['causes'], string>): Failure =>
    new Failure(`${table.domain}::${cause}`, table.causes[cause]);

export const route = <I, O>(endpoint: Endpoint<I, O>, handle: (params: Params, body: I) => O | Failure): Route => ({
    method: endpoint.method,
    pattern: new RegExp(`^${endpoint.path.replace(PARAM, '([^/]+)')}$`),
    names: Array.from(endpoint.path.matchAll(PARAM), (match) => match[1]),
    handle: (params, rawBody) => handle(params, rawBody === '' ? undefined : JSON.parse(rawBody))
});

export const matchRoute = (routes: Route[], method: string, path: string): RouteMatch | null => {
    for(const candidate of routes){
        const match = candidate.method === method ? candidate.pattern.exec(path) : null;
        if(!match) continue;

        const params = Object.fromEntries(candidate.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));

        return { route: candidate, params };
    }

    return null;
};
