import { config } from '@/config';
import { ApiResponse } from '@lammps-studio/contracts/shared/http';
import { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { expect } from 'vitest';
import { AgentApp } from './harness';

type RouteValues = Record<string, number | string>;

export const authorized = { authorization: `Bearer ${config.token}` };

export interface RequestOptions<I>{
    body?: I;
    params?: RouteValues;
    query?: RouteValues;
}

export interface TestResponse<O>{
    status: number;
    body: string;
    raw: Buffer;
    contentType: string | undefined;
    json: <T = Record<string, unknown>>() => T;
    data: () => O;
}

const withParams = (path: string, params: RouteValues): string => {
    let url = path;
    for(const [name, value] of Object.entries(params)){
        url = url.replace(`:${name}`, encodeURIComponent(String(value)));
    }
    return url;
};

const withQuery = (url: string, query?: RouteValues): string => {
    if(!query) return url;

    const search = new URLSearchParams();
    for(const [key, value] of Object.entries(query)){
        search.set(key, String(value));
    }
    return `${url}?${search}`;
};

export const request = async <I, O>(
    app: AgentApp,
    endpoint: Endpoint<I, O>,
    { body, params = {}, query }: RequestOptions<I> = {}
): Promise<TestResponse<O>> => {
    const res = await app.inject({
        method: endpoint.method,
        url: withQuery(withParams(endpoint.path, params), query),
        headers: authorized,
        payload: body as object | undefined
    });

    return {
        status: res.statusCode,
        body: res.body,
        raw: res.rawPayload,
        contentType: res.headers['content-type'],
        json: <T>() => res.json() as T,
        data: () => (res.json() as ApiResponse<O>).data
    };
};

export const expectError = (res: TestResponse<unknown>, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.json()).toMatchObject({ error: code });
};
