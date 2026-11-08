import typia from '@typia/unplugin/vite';
import { autoValidateBody } from '@lammps-studio/readable/vite/auto-validate-body';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        autoValidateBody(),
        typia({ tsconfig: './tsconfig.json', cache: true, log: false })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@tests': fileURLToPath(new URL('./tests', import.meta.url))
        }
    },
    test: {
        include: ['src/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
        restoreMocks: true,
        hookTimeout: 60000
    }
});
