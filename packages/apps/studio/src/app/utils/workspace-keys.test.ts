import { describe, expect, it } from 'vitest';
import { KeyChord } from '@/app/contracts/workspace-keys';
import { isInControl, workspaceKeyOf } from '@/app/utils/workspace-keys';

const chord = (key: string, patch: Partial<KeyChord> = {}): KeyChord => ({ key, mod: false, shift: false, alt: false, inControl: false, ...patch });

describe('workspaceKeyOf', () => {
    it.each([
        ['Enter', 'run'],
        ['.', 'stop']
    ] as const)('maps Ctrl %s to %s', (key, action) => {
        expect(workspaceKeyOf(chord(key, { mod: true }))).toBe(action);
    });

    it.each([
        ['K', 'check'],
        ['L', 'output'],
        ['C', 'charts'],
        ['V', 'variables']
    ] as const)('maps Ctrl Shift %s to %s', (key, action) => {
        expect(workspaceKeyOf(chord(key, { mod: true, shift: true }))).toBe(action);
    });

    it('leaves Ctrl K to the command palette and plain letters to the page', () => {
        expect(workspaceKeyOf(chord('k', { mod: true }))).toBeNull();
        expect(workspaceKeyOf(chord('l'))).toBeNull();
    });

    it('runs from inside a field, because Ctrl Enter is not typing', () => {
        expect(workspaceKeyOf(chord('Enter', { mod: true, inControl: true }))).toBe('run');
    });

    it('steps frames with the arrows outside controls', () => {
        expect(workspaceKeyOf(chord('ArrowLeft'))).toBe('previous-frame');
        expect(workspaceKeyOf(chord('ArrowRight'))).toBe('next-frame');
    });

    it('leaves the arrows to fields, the resize handle, the ruler and menus', () => {
        expect(workspaceKeyOf(chord('ArrowLeft', { inControl: true }))).toBeNull();
        expect(workspaceKeyOf(chord('ArrowRight', { shift: true }))).toBeNull();
        expect(workspaceKeyOf(chord('ArrowRight', { alt: true }))).toBeNull();
    });
});

describe('isInControl', () => {
    it('recognises fields and the controls that own the arrows', () => {
        document.body.innerHTML = '<input id="field"><div role="separator" id="resize"></div><div role="menu"><button id="item"></button></div><button id="plain"></button>';

        expect(isInControl(document.getElementById('field'))).toBe(true);
        expect(isInControl(document.getElementById('resize'))).toBe(true);
        expect(isInControl(document.getElementById('item'))).toBe(true);
        expect(isInControl(document.getElementById('plain'))).toBe(false);
        expect(isInControl(null)).toBe(false);
    });
});
