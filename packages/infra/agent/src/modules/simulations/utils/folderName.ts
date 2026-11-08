const COMBINING_MARK = /\p{M}/gu;
const NOT_A_WORD = /[^\p{L}\p{N}]+/gu;
const EDGE_DASHES = /^-+|-+$/g;
const UNNAMED = 'simulation';

export const folderNameOf = (name: string): string => {
    const kebab = name
        .normalize('NFKD')
        .replace(COMBINING_MARK, '')
        .toLowerCase()
        .replace(NOT_A_WORD, '-')
        .replace(EDGE_DASHES, '');
    if(kebab === '') return UNNAMED;

    return kebab;
};
