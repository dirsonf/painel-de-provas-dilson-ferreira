import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'lucide-react',
        'motion/react',
      ],
    },
    server: {
      host: true,
      port: 3000,
      allowedHosts: [
        'painel-de-provas-dilson-ferreira.ai.studio',
        '.ai.studio',
        'dilsonferreira.com.br',
        'www.dilsonferreira.com.br',
        '.run.app',
      ],
      // HMR is disabled in cloud preview environment to prevent WebSocket closed errors
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: true,
      port: 3000,
      allowedHosts: [
        'painel-de-provas-dilson-ferreira.ai.studio',
        '.ai.studio',
        'dilsonferreira.com.br',
        'www.dilsonferreira.com.br',
        '.run.app',
      ],
    },
  };
});
