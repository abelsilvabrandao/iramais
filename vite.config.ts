import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do sistema ou arquivos .env
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // 'base' define o caminho base relativo. 
    // Isso é CRUCIAL para o GitHub Pages funcionar em subdiretórios (ex: usuario.github.io/repo).
    base: './', 
    define: {
      // Garante que o código que usa 'process.env.API_KEY' funcione no navegador
      // substituindo-o pelo valor real durante o build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Previne erros de "process is not defined" no navegador
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});