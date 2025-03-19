import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/sigmanauts-proxy': {
        target: 'http://5.78.102.130:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/sigmanauts-proxy', '/sigscore/miners'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const url = req.url || '';
            if (url.includes('?')) {
              const queryString = url.split('?')[1];
              proxyReq.path = `${proxyReq.path}?${queryString}`;
            }
            console.log('Sending Request to the Target:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
