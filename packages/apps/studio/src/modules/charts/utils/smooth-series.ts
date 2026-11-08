const DEFAULT_WINDOW = 10;

export const smoothSeries = (values: number[], window = DEFAULT_WINDOW): number[] => {
    const half = Math.floor(window / 2);
    const prefix = new Float64Array(values.length + 1);

    for(let i = 0; i < values.length; i++){
        prefix[i + 1] = prefix[i] + values[i];
    }

    return values.map((_, i) => {
        const from = Math.max(0, i - half);
        const to = Math.min(values.length - 1, i + half);

        return (prefix[to + 1] - prefix[from]) / (to - from + 1);
    });
};
