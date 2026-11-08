import { ApiError } from '@lammps-studio/contracts/shared/http';
import { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { agentEndpoint } from '@/shared/config/agent';
import { CallOptions, PathValues } from '@/shared/contracts/api';
import { AgentErrors } from '@/shared/contracts/errors';
import { ClientError } from '@/shared/errors/ClientError';
import { defineErrors } from '@/shared/errors/define-errors';

const agentError = defineErrors(AgentErrors);

const NO_CONTENT = 204;
const PATH_PARAM = /:(\w+)/g;
const JSON_TYPE = 'application/json';

export const interpolatePath = (path: string, values: PathValues = {}): string =>
    path.replace(PATH_PARAM, (_, name: string) => {
        const value = values[name];
        if(value === undefined) throw agentError('MissingPathParam', `${name}@${path}`);

        return encodeURIComponent(value);
    });

const urlOf = (base: string, path: string, query: object = {}): URL => {
    const url = new URL(path, base);
    for(const [name, value] of Object.entries(query)){
        url.searchParams.set(name, String(value));
    }

    return url;
};

const headersOf = (token: string, hasBody: boolean): Record<string, string> => {
    const auth = { Authorization: `Bearer ${token}` };
    if(!hasBody) return auth;

    return { ...auth, 'Content-Type': JSON_TYPE };
};

const isJson = (response: Response): boolean => response.headers.get('content-type')?.includes(JSON_TYPE) ?? false;

const failureOf = async (response: Response): Promise<ClientError> => {
    if(!isJson(response)) return agentError('UnexpectedResponse', `${response.status} ${response.statusText}`);

    const payload: ApiError = await response.json();

    return new ClientError(payload.error, response.status);
};

const decode = async (response: Response) => {
    if(response.status === NO_CONTENT) return undefined;
    if(!isJson(response)) return response.arrayBuffer();

    const payload = await response.json();

    return payload.data;
};

export const call = async <I, O>(endpoint: Endpoint<I, O>, options: CallOptions<I> = {}): Promise<O> => {
    const agent = agentEndpoint();
    if(!agent) throw agentError('NotConfigured');

    const url = urlOf(agent.url, interpolatePath(endpoint.path, options.path), options.query);
    const response = await fetch(url, {
        method: endpoint.method,
        headers: headersOf(agent.token, options.body !== undefined),
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    }).catch((cause: unknown) => {
        throw agentError('Unreachable', cause);
    });
    if(!response.ok) throw await failureOf(response);

    return decode(response);
};
