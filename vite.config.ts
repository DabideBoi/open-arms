import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Output directory
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Minify with esbuild (faster than terser)
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Rollup options for optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id: string) => {
          if (id.indexOf('node_modules') !== -1) {
            if (id.indexOf('react') !== -1 || id.indexOf('react-dom') !== -1) {
              return 'react-vendor';
            }
            if (id.indexOf('phaser') !== -1) {
              return 'phaser-vendor';
            }
            return 'vendor';
          }
        },
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          let extType = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
            extType = 'img';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType ?? '')) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // CSS code splitting
    cssCodeSplit: true,
    // Asset inline limit (4kb)
    assetsInlineLimit: 4096,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'phaser'],
  },
});
