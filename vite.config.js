import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    plugins: [vue()],
    build: {
        chunkSizeWarningLimit: 1500
    },
})
