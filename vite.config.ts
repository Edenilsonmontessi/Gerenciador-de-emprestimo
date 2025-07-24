import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './', // Corrigido para build funcionar no Tauri
    server: {
      host: true, // Permitir acesso pela rede local
      port: Number(env.VITE_PORT) || 5173, // Porta padrão
      strictPort: false, // Permitir mudança de porta se a padrão estiver ocupada
    },
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
