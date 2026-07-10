import { existsSync } from 'node:fs';

/** Serve the built dist/ directory on a random port. Caller must stop() the server. */
export function serveDist() {
  const dist = new URL('../dist/', import.meta.url).pathname;
  if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` first');

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path.endsWith('/')) path += 'index.html';
      let file = Bun.file(dist + path);
      if (!(await file.exists())) file = Bun.file(dist + path + '/index.html');
      if (!(await file.exists())) return new Response('not found', { status: 404 });
      return new Response(file);
    },
  });

  return { server, origin: `http://localhost:${server.port}`, dist };
}
