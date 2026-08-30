import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Plataforma de Coaching Deportivo',
        short_name: 'CoachApp',
        theme_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src')
    }
  }
});
