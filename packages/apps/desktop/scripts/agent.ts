import typia from '@typia/unplugin/esbuild';
import { build } from 'esbuild';
import { join } from 'node:path';

const NODE_TARGET = 'node24';
const NATIVE_OPTIONALS = ['cpu-features', '*.node'];

const desktopDir = join(import.meta.dirname, '..');
const agentDir = join(desktopDir, '..', '..', 'infra', 'agent');

await build({
    entryPoints: [join(agentDir, 'src', 'server.ts')],
    outfile: join(desktopDir, 'dist', 'agent.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: NODE_TARGET,
    external: NATIVE_OPTIONALS,
    plugins: [typia({ tsconfig: join(agentDir, 'tsconfig.json') })]
});
