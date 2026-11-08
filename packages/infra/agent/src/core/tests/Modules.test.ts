import { MANIFEST_FILE, renderManifest } from '../../../scripts/moduleManifest';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('the module manifest', () => {
    it('lists every controller and gateway under src/modules (pnpm modules regenerates it)', async () => {
        expect(await readFile(MANIFEST_FILE, 'utf8')).toBe(await renderManifest());
    });
});
