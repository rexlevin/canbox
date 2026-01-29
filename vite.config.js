import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    base: './', // 使用相对路径，确保在 asar 环境中正常工作
    resolve: {
        alias: {
            '@': '/src'
        },
    },
    plugins: [vue()],
    build: {
        outDir: 'build',
        chunkSizeWarningLimit: 1500,
        assetsDir: 'assets',
        // 确保资源文件名包含哈希，避免缓存问题
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js'
            }
        }
    },
    server: {
        watch: {
            // 排除不需要监听的目录，避免符号链接循环导致的 ELOOP 错误
            ignored: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/logs/**'
            ]
        }
    }
})
