import ModuleDiscovery from '@lammps-studio/readable/services/ModuleDiscovery';
import { fileURLToPath, URL } from 'node:url';

const MODULES_DIR = fileURLToPath(new URL('../src/modules', import.meta.url));
const MANIFEST_SPECIFIER = '../modules';

export const MANIFEST_FILE = fileURLToPath(new URL('../src/core/modules.ts', import.meta.url));

export const renderManifest = (): Promise<string> => new ModuleDiscovery(MODULES_DIR).manifest(MANIFEST_SPECIFIER);
