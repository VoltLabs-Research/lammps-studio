const BASE_CODE = /^([^:]+::[^:]+)/;

export const baseCodeOf = (code: string): string => BASE_CODE.exec(code)?.[1] ?? code;

export interface ErrorTable{
    readonly domain: string;
    readonly causes: Readonly<Record<string, number>>;
}

export type ErrorCode<T extends ErrorTable> =
    `${T['domain']}::${Extract<keyof T['causes'], string>}`;

export const GatewayErrors = {
    domain: 'Gateway',
    causes: {
        MissingChannel: 500,
        MalformedFrame: 400,
        UnknownMessageType: 400,
        Internal: 500
    }
} as const satisfies ErrorTable;

export type GatewayErrorCode = ErrorCode<typeof GatewayErrors>;

export const RequestErrors = {
    domain: 'Request',
    causes: {
        InvalidId: 400,
        ValidationFailed: 400,
        Unauthorized: 401
    }
} as const satisfies ErrorTable;

export type RequestErrorCode = ErrorCode<typeof RequestErrors>;
