import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Development preview only. Production remains an ordinary static HTML Site.
// Serve the inline module verbatim so native import maps resolve vendored Three.
export default defineConfig({
  appType: 'custom',
  publicDir: 'public',
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [{
    name: 'static-cutaway-document',
    configureServer(server) {
      server.middlewares.use((request,response,next) => {
        if (request.url?.split('?')[0] !== '/' && request.url?.split('?')[0] !== '/index.html') return next();
        response.setHeader('Content-Type','text/html; charset=utf-8');
        response.setHeader('Cache-Control','no-store');
        response.end(readFileSync(new URL('./public/index.html',import.meta.url)));
      });
    }
  }]
});
