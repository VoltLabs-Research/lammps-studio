import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 5180,
        strictPort: true
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.{ts,tsx}']
    }
});
