import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files larger than 10kb
    }),
  ],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        // Manual chunking strategy - split heavy ML libraries
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom'],

          // TensorFlow.js - separate large chunk
          'vendor-ml-tensorflow': ['@tensorflow/tfjs'],

          // ML libraries - separate chunk
          'vendor-ml': ['ml-random-forest', 'ml-cart'],

          // Plotly for charts - separate chunk
          'vendor-plotly': ['plotly.js-dist-min', 'react-plotly.js'],

          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
        },

        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Reduce CSS code splitting
    cssCodeSplit: true,

    // Source maps for debugging (disable in production for smaller size)
    sourcemap: false,
  },

  // Server configuration
  server: {
    port: 3000,
    host: true,
  },

  // Preview configuration
  preview: {
    port: 3000,
    host: true,
  },
});
