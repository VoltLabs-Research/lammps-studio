import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { FinderKey, FinderKeyAction } from '@/modules/files/domain/files';

const STEPS: Record<string, number> = {
    ArrowDown: 1,
    ArrowUp: -1
};

const clamp = (value: number, last: number): number => Math.min(Math.max(value, 0), last);

const moved = (key: string, entries: FileEntry[], selected: string | null): FinderKeyAction | null => {
    const last = entries.length - 1;
    const index = entries.findIndex((entry) => entry.path === selected);
    if(key === 'Home') return { kind: 'select', path: entries[0].path };
    if(key === 'End') return { kind: 'select', path: entries[last].path };

    const step = STEPS[key];
    if(step === undefined) return null;
    if(index < 0) return { kind: 'select', path: entries[step > 0 ? 0 : last].path };

    return { kind: 'select', path: entries[clamp(index + step, last)].path };
};

export const finderKeyAction = ({ key, command }: FinderKey, entries: FileEntry[], selected: string | null): FinderKeyAction | null => {
    if(command && key === 'ArrowUp') return { kind: 'parent' };
    if(entries.length === 0) return null;
    if(key === 'Enter' || (command && key === 'ArrowDown')) return selected === null ? null : { kind: 'open' };

    return moved(key, entries, selected);
};
