const GROUPED_FROM = 1000;
const ONE_DECIMAL_FROM = 100;
const TWO_DECIMALS_FROM = 1;
const SMALL_PRECISION = 3;

export const formatValue = (value: number): string => {
    const size = Math.abs(value);

    if(!Number.isFinite(value)){
        return String(value);
    }
    if(size >= GROUPED_FROM){
        return Math.round(value).toLocaleString('en-US');
    }
    if(size >= ONE_DECIMAL_FROM){
        return value.toFixed(1);
    }
    if(size >= TWO_DECIMALS_FROM || value === 0){
        return value.toFixed(2);
    }

    return value.toPrecision(SMALL_PRECISION);
};
