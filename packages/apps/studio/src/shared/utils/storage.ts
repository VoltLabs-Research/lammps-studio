export const readChoice = <V extends string>(key: string, choices: readonly V[], fallback: V): V => {
    const stored = localStorage.getItem(key);

    return choices.find((choice) => choice === stored) ?? fallback;
};

export const readFlag = (key: string, fallback: boolean): boolean => {
    const stored = localStorage.getItem(key);
    if(stored === null) return fallback;

    return stored === 'true';
};

export const writeValue = (key: string, value: string | boolean) => {
    localStorage.setItem(key, String(value));
};
