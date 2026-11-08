const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const NOT_A_NUMBER = /^[-+]?nan$/i;
const INFINITE = /^([-+]?)inf(?:inity)?$/i;
const WHITESPACE = /\s+/;

export const isNumeric = (token: string): boolean => {
    return NUMBER.test(token) || NOT_A_NUMBER.test(token) || INFINITE.test(token);
};

export const parseNumber = (token: string): number => {
    const infinite = INFINITE.exec(token);
    if(infinite){
        return infinite[1] === '-' ? -Infinity : Infinity;
    }

    return Number(token);
};

export const splitTokens = (text: string): string[] => {
    const trimmed = text.trim();
    if(trimmed.length === 0){
        return [];
    }

    return trimmed.split(WHITESPACE);
};

export const splitLines = (text: string): string[] => {
    const lines = text.split(/\r?\n/);
    if(lines.at(-1) === ''){
        lines.pop();
    }

    return lines;
};
