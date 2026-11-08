import { SimulationTemplate } from '@lammps-studio/contracts/simulation/domain';
import { BookOpen, Copy, FileCode, Folder, LucideIcon } from 'lucide-react';
import { SegOption } from '@/shared/contracts/ui';

export type ExampleName = 'melt' | 'crack' | 'indent';

export interface TemplateOption{
    value: SimulationTemplate;
    icon: LucideIcon;
    title: string;
    sub: string;
}

export const TEMPLATES: readonly TemplateOption[] = [
    { value: 'empty', icon: FileCode, title: 'Empty main.in', sub: 'units, atom_style and a run, ready to edit' },
    { value: 'example', icon: BookOpen, title: 'LAMMPS example', sub: 'melt, crack, indent' },
    { value: 'folder', icon: Folder, title: 'Folder on disk', sub: 'Upload or point at an existing folder' },
    { value: 'git', icon: Copy, title: 'Git repository', sub: 'Clone it into the simulation folder' }
];

export const EXAMPLES: SegOption<ExampleName>[] = [
    { value: 'melt', label: 'melt' },
    { value: 'crack', label: 'crack' },
    { value: 'indent', label: 'indent' }
];
