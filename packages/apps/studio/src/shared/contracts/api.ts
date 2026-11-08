export type PathValues = Record<string, string | number>;

export interface CallOptions<I>{
    path?: PathValues;
    query?: object;
    body?: I;
}
