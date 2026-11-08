export const FOLDER = 'Folder';
export const LAMMPS_INPUT = 'LAMMPS input';

const DOCUMENT = 'Document';

interface KindRule{
    kind: string;
    pattern: RegExp;
}

const RULES: KindRule[] = [
    { kind: 'LAMMPS log', pattern: /^log\.|\.log$/ },
    { kind: LAMMPS_INPUT, pattern: /\.(in|lmp|lammps)$/ },
    { kind: 'Dump, text', pattern: /^dump\.|\.(lammpstrj|dump)$/ },
    { kind: 'Restart, binary', pattern: /^restart\.|\.restart$/ },
    { kind: 'Data file', pattern: /^data\.|\.data$/ },
    { kind: 'EAM potential', pattern: /\.eam(\.|$)/ },
    { kind: 'Markdown', pattern: /\.md$/ }
];

export const fileKindOf = (name: string): string => {
    const lowered = name.toLowerCase();

    return RULES.find((rule) => rule.pattern.test(lowered))?.kind ?? DOCUMENT;
};
