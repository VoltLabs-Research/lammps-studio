const MILLION = 1e6;
const TEN_MILLION = 1e7;
const TEN_THOUSAND = 1e4;
const THOUSAND = 1e3;
const TEN = 10;
const SMALL_PRECISION = 2;

export const compact = (value: number): string => {
    const size = Math.abs(value);

    if(size >= MILLION){
        return `${(value / MILLION).toFixed(size >= TEN_MILLION ? 0 : 1)}M`;
    }
    if(size >= TEN_THOUSAND){
        return `${(value / THOUSAND).toFixed(0)}k`;
    }
    if(size >= THOUSAND){
        return `${(value / THOUSAND).toFixed(1).replace(/\.0$/, '')}k`;
    }
    if(size >= TEN || value === 0){
        return String(Math.round(value * TEN) / TEN);
    }

    return String(Number(value.toPrecision(SMALL_PRECISION)));
};
