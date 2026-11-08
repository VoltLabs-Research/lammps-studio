import { MANIFEST_FILE, renderManifest } from './moduleManifest';
import { writeFile } from 'node:fs/promises';

await writeFile(MANIFEST_FILE, await renderManifest());
