import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// This is the LEGACY Vite configuration
// For Next.js, this is NOT used. Use: npm run dev (Next.js)
// For legacy HTML pages, use: npm run legacy:dev

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Only serve legacy HTML files
  publicDir: 'public',
  build: {
    outDir: 'dist-legacy',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        application: path.resolve(__dirname, 'application.html'),
        showcase: path.resolve(__dirname, 'components-showcase.html'),
        pay: path.resolve(__dirname, 'pay.html'),
        testimonials: path.resolve(__dirname, 'testimonials.html'),
      },
    },
  },
})
