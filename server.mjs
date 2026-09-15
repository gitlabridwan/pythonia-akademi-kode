import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const root = resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname);
    const relative = normalize(pathname).replace(/^[/\\]+/, "");
    let target = resolve(join(root, relative || "index.html"));
    if (!target.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": target.endsWith("multiplayer-config.json") ? "no-store" : "public, max-age=300"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 — File tidak ditemukan");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`PYTHONIA berjalan di http://localhost:${port}`);
  console.log("Tekan Ctrl+C untuk menghentikan server.");
});
