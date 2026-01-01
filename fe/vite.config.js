import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'
  const port = isDev ? 3000 : 3001
  
  // Load license key from environment
  const licenseKey = process.env.VITE_LICENSE_KEY || '';

  return {
    plugins: [react()],
    define: {
      __ENV__: JSON.stringify(mode),
      // Inject license key into the build
      'import.meta.env.VITE_LICENSE_KEY': JSON.stringify(licenseKey),
    },
    envPrefix: 'VITE_',
    server: {
      port: port,
      open: true,
      host: 'localhost'
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'monaco-editor': ['monaco-editor', '@monaco-editor/react'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          }
        }
      },
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        format: {
          comments: false
        }
      },
      cssMinify: true,
      reportCompressedSize: false,
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})

