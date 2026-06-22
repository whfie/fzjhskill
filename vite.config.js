/*
 * @Author: whfie 3449861455@qq.com
 * @Date: 2026-06-22 20:06:22
 * @LastEditors: whfie 3449861455@qq.com
 * @LastEditTime: 2026-06-22 21:49:48
 * @FilePath: \fzjhskill\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from "vite";
import { resolve } from "path";

// GitHub Pages 部署：base 设为 /fzjhskill/，项目将发布在 https://user.github.io/fzjhskill/
export default defineConfig({
  base: "/fzjhskill/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    cssCodeSplit: true,
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        yinmai: resolve(__dirname, "yinmai.html"),
      },
      output: {
        // 将共享的第三方依赖与公共模块提取到单独 chunk，优化缓存
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
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
