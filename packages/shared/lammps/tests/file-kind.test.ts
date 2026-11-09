import { describe, expect, it } from 'vitest';
import { fileKindOf, isLammpsOutput } from '../src/files/file-kind';

describe('fileKindOf', () => {
    it.each([
        ['log.lammps', 'LAMMPS log'],
        ['screen.log', 'LAMMPS log'],
        ['main.in', 'LAMMPS input'],
        ['water.lmp', 'LAMMPS input'],
        ['setup.lammps', 'LAMMPS input'],
        ['wire.lammpstrj', 'Dump, text'],
        ['dump.melt', 'Dump, text'],
        ['restart.50000.cu', 'Restart, binary'],
        ['final.data', 'Data file'],
        ['Cu01.eam.alloy', 'EAM potential'],
        ['Ni_u3.eam', 'EAM potential'],
        ['README.md', 'Markdown'],
        ['MAIN.IN', 'LAMMPS input'],
        ['notes.txt', 'Document']
    ])('names %s a %s', (name, kind) => {
        expect(fileKindOf(name)).toBe(kind);
    });
});

describe('isLammpsOutput', () => {
    it.each([
        ['log.lammps', true],
        ['wire.lammpstrj', true],
        ['restart.50000.cu', true],
        ['setup.lammps', false],
        ['main.in', false],
        ['final.data', false],
        ['Cu01.eam.alloy', false]
    ])('takes %s for output LAMMPS writes: %s', (name, output) => {
        expect(isLammpsOutput(name)).toBe(output);
    });
});
