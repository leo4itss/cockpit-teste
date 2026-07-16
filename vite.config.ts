import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // @pas/ui publica uma condição "development" no exports map apontando
      // para ./src/index.ts, mas o pacote publicado só inclui dist/ (src/ não
      // é publicado). O Vite prioriza essa condição em dev e a resolução
      // quebra — força a entrada real do pacote até isso ser corrigido rio acima.
      '@pas/ui': path.resolve(__dirname, 'node_modules/@pas/ui/dist/index.js'),
    },
    // Força uma única cópia de React — necessário para @xyflow/react
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
