import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteImagemin from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      gifsicle: { optimizationLevel: 7, interlaced: false },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 75 },
      pngquant: { quality: [0.7, 0.9], speed: 3 },
      svgo: { plugins: [{ name: 'removeViewBox', active: false }] },
      webp: { quality: 75 },
      avif: { quality: 50 }
    }),
    visualizer({ open: false, filename: 'dist/bundle-analysis.html' })
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    minify: 'terser',
    target: 'esnext',
    cssMinify: true,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      },
      plugins: [visualizer({ open: false, filename: 'dist/bundle-analysis.html' })]
    }
  },
  define: {
    // Fix for mapbox-gl
    'process.env': {}
  }
})
