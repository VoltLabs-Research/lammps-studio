export const FOLDER = 'Folder';
export const LAMMPS_INPUT = 'LAMMPS input';

const DOCUMENT = 'Document';
const LAMMPS_LOG = 'LAMMPS log';
const TEXT_DUMP = 'Dump, text';
const BINARY_RESTART = 'Restart, binary';
const OUTPUT_KINDS = new Set([LAMMPS_LOG, TEXT_DUMP, BINARY_RESTART]);

interface KindRule{
    kind: string;
    pattern: RegExp;
}

const RULES: KindRule[] = [
    { kind: LAMMPS_LOG, pattern: /^log\.|\.log$/ },
    { kind: LAMMPS_INPUT, pattern: /\.(in|lmp|lammps)$/ },
    { kind: TEXT_DUMP, pattern: /^dump\.|\.(lammpstrj|dump)$/ },
    { kind: BINARY_RESTART, pattern: /^restart\.|\.restart$/ },
    { kind: 'Data file', pattern: /^data\.|\.data$/ },
    { kind: 'EAM potential', pattern: /\.eam(\.|$)/ },
    { kind: 'Markdown', pattern: /\.md$/ }
];

export const fileKindOf = (name: string): string => {
    const lowered = name.toLowerCase();

    return RULES.find((rule) => rule.pattern.test(lowered))?.kind ?? DOCUMENT;
};

export const isLammpsOutput = (name: string): boolean => {
    return OUTPUT_KINDS.has(fileKindOf(name));
};
