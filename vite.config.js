import { defineConfig } from 'vite';
import { resolve } from 'path';

// GitHub Pages 部署：base 为相对路径，便于在任何子路径下访问
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        yinmai: resolve(__dirname, 'yinmai.html'),
      },
      output: {
        // 将共享的第三方依赖与公共模块提取到单独 chunk，优化缓存
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
