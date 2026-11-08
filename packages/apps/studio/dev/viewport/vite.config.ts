import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react()],
    resolve: {
        alias: {
            '@dev': fileURLToPath(new URL('.', import.meta.url)),
            '@': fileURLToPath(new URL('../../src', import.meta.url))
        }
    },
    server: {
        port: 5181,
        strictPort: true
    }
});
