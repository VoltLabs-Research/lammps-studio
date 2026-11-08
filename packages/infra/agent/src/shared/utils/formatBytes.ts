const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
const STEP = 1024;
const ONE_DECIMAL_BELOW = 10;

export const formatBytes = (bytes: number): string => {
    let value = bytes;
    let unit = 0;
    while(value >= STEP && unit < UNITS.length - 1){
        value /= STEP;
        unit += 1;
    }

    const digits = unit > 0 && value < ONE_DECIMAL_BELOW ? 1 : 0;
    return `${value.toFixed(digits)} ${UNITS[unit]}`;
};
