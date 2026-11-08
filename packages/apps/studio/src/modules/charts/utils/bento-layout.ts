export const BENTO_ROW = 148;
export const BENTO_GAP = 12;
export const BENTO_PADDING = 12;

const MIN_WIDTH = 260;
const FOUR_COLUMNS_FROM = 640;
const TWO_COLUMNS_FROM = 400;
const MAX_FEATURED_SPAN = 3;
const FEATURED_ROWS = 2;

const ROW_PATTERNS: Record<number, number[][]> = {
    4: [[1, 2, 1], [2, 2]],
    2: [[1, 1], [1, 1], [2]],
    1: [[1]]
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

const fillRow = (columns: number, tiles: number): number[] => {
    const base = Math.floor(columns / tiles);
    const extra = columns % tiles;
    const first = Math.floor((tiles - extra) / 2);

    return Array.from({ length: tiles }, (_, index) => base + (index >= first && index < first + extra ? 1 : 0));
};

export const bentoSpans = (count: number, columns: number): number[] => {
    const beside = Math.min(count, (columns - featuredSpan(columns)) * FEATURED_ROWS);
    const spans: number[] = Array.from({ length: beside }, () => 1);
    const rows = ROW_PATTERNS[columns];

    for(let row = 0; spans.length < count; row++){
        const pattern = rows[row % rows.length];
        const left = count - spans.length;

        spans.push(...(left >= pattern.length ? pattern : fillRow(columns, left)));
    }

    return spans;
};
