export const BENTO_ROW = 148;
export const BENTO_GAP = 12;
export const BENTO_PADDING = 12;

const MIN_WIDTH = 260;
const FOUR_COLUMNS_FROM = 640;
const TWO_COLUMNS_FROM = 400;
const MAX_FEATURED_SPAN = 3;

const SPAN_PATTERNS: Record<number, number[]> = {
    4: [1, 1, 1, 2, 1, 2, 2],
    2: [1, 1, 1, 1, 2, 1, 1],
    1: [1, 1, 1, 1, 1, 1, 1]
};

export const bentoInnerWidth = (width: number): number => {
    return Math.max(MIN_WIDTH, width - BENTO_PADDING * 2);
};

export const bentoColumns = (innerWidth: number): number => {
    if(innerWidth >= FOUR_COLUMNS_FROM){
        return 4;
    }
    if(innerWidth >= TWO_COLUMNS_FROM){
        return 2;
    }

    return 1;
};

export const featuredSpan = (columns: number): number => {
    return Math.min(MAX_FEATURED_SPAN, columns);
};

export const tileWidth = (innerWidth: number, columns: number, span: number): number => {
    const column = (innerWidth - (columns - 1) * BENTO_GAP) / columns;

    return column * span + BENTO_GAP * (span - 1);
};

export const tileSpan = (index: number, columns: number): number => {
    return SPAN_PATTERNS[columns][index] ?? 1;
};
