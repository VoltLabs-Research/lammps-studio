import { ACCELERATOR_SUFFIXES, STYLE_RULES, StyleCommand } from './package-rules';

const packageOf = (command: StyleCommand, style: string): string | null => {
    const match = STYLE_RULES.find((rule) => rule.command === command && rule.pattern.test(style));
    return match?.name ?? null;
};

export const packagesForStyle = (command: StyleCommand, style: string): string[] => {
    const suffix = ACCELERATOR_SUFFIXES.find((entry) => entry.pattern.test(style));
    if(!suffix){
        return [packageOf(command, style)].filter((name) => name !== null);
    }

    const base = style.replace(suffix.pattern, '');
    return [packageOf(command, base), suffix.name].filter((name) => name !== null);
};
