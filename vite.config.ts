import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Força uma única cópia de React — necessário para @xyflow/react
    dedupe: ['react', 'react-dom'],
    // @pas/ui publica uma condição "development" no exports map apontando para
    // ./src/index.ts, mas o pacote publicado só inclui dist/ (src/ não é
    // publicado). O Vite prioriza "development" em modo dev e a resolução
    // quebra — omitimos essa condição até o pacote ser corrigido na lib.
    conditions: ['module', 'browser', 'production'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
