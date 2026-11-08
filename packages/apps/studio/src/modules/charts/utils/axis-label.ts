const THOUSANDS_FROM = 1e4;
const THOUSANDS_MIN_STEP = 100;
const THOUSANDS_DIGITS = 3;
const MAX_DIGITS = 4;

export const axisLabel = (value: number, step: number): string => {
    if(Math.abs(value) >= THOUSANDS_FROM && step >= THOUSANDS_MIN_STEP){
        const digits = Math.max(0, THOUSANDS_DIGITS - Math.floor(Math.log10(step)));

        return `${(value / 1000).toFixed(digits)}k`;
    }

    const digits = Math.max(0, -Math.floor(Math.log10(step)));

    return value.toFixed(Math.min(digits, MAX_DIGITS));
};
