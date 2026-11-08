import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

const root = await mkdtemp(join(tmpdir(), 'lammps-studio-'));

Object.assign(process.env, {
    LAMMPS_STUDIO_ROOT: root,
    LAMMPS_AGENT_TOKEN: 'test-agent-token',
    LOG_LEVEL: 'silent'
});

afterAll(() => rm(root, { recursive: true, force: true }));
