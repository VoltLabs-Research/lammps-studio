const TRIPLE_QUOTE = '"""';
const CONTINUATION = /&\s*$/;
const LINE_BREAK = /\r?\n/;
const WHITESPACE = /\s/;

export interface ScriptStatement{
    line: number;
    text: string;
}

export type VariableLookup = (name: string) => string | null;

const quoteEnd = (text: string, start: number): number => {
    if(text.startsWith(TRIPLE_QUOTE, start)){
        const end = text.indexOf(TRIPLE_QUOTE, start + TRIPLE_QUOTE.length);
        return end < 0 ? text.length : end + TRIPLE_QUOTE.length;
    }

    const end = text.indexOf(text[start], start + 1);
    return end < 0 ? text.length : end + 1;
};

const isQuote = (char: string): boolean => {
    return char === '"' || char === "'";
};

const stripComment = (text: string): string => {
    let index = 0;
    while(index < text.length){
        if(text[index] === '#'){
            return text.slice(0, index);
        }

        index = isQuote(text[index]) ? quoteEnd(text, index) : index + 1;
    }

    return text;
};

export const readStatements = (source: string): ScriptStatement[] => {
    const lines = source.split(LINE_BREAK);
    const statements: ScriptStatement[] = [];
    let index = 0;

    while(index < lines.length){
        const line = index + 1;
        let text = lines[index];
        while(CONTINUATION.test(text) && index + 1 < lines.length){
            index += 1;
            text = `${text.replace(CONTINUATION, ' ')}${lines[index]}`;
        }

        const command = stripComment(text).trim();
        if(command.length > 0){
            statements.push({ line, text: command });
        }
        index += 1;
    }

    return statements;
};

const unquote = (word: string): string => {
    if(word.startsWith(TRIPLE_QUOTE) && word.endsWith(TRIPLE_QUOTE) && word.length >= 2 * TRIPLE_QUOTE.length){
        return word.slice(TRIPLE_QUOTE.length, -TRIPLE_QUOTE.length);
    }

    if(word.length >= 2 && isQuote(word[0]) && word.at(-1) === word[0]){
        return word.slice(1, -1);
    }

    return word;
};

export const splitWords = (text: string): string[] => {
    const words: string[] = [];
    let index = 0;

    while(index < text.length){
        if(WHITESPACE.test(text[index])){
            index += 1;
            continue;
        }

        let end = index;
        while(end < text.length && !WHITESPACE.test(text[end])){
            end = isQuote(text[end]) ? quoteEnd(text, end) : end + 1;
        }

        words.push(unquote(text.slice(index, end)));
        index = end;
    }

    return words;
};

const reference = (text: string, start: number): [string, number] => {
    if(text[start + 1] === '{'){
        const close = text.indexOf('}', start + 2);
        return close < 0 ? ['', text.length] : [text.slice(start + 2, close), close + 1];
    }

    return [text[start + 1] ?? '', start + 2];
};

export const substitute = (text: string, lookup: VariableLookup): string => {
    let output = '';
    let index = 0;

    while(index < text.length){
        const char = text[index];
        if(isQuote(char)){
            const end = quoteEnd(text, index);
            output += text.slice(index, end);
            index = end;
            continue;
        }

        if(char !== '$' || text[index + 1] === '('){
            output += char;
            index += 1;
            continue;
        }

        const [name, end] = reference(text, index);
        output += lookup(name) ?? text.slice(index, end);
        index = end;
    }

    return output;
};
