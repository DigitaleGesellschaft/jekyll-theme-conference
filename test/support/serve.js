/**
 * Minimal static file server for the built fixture site
 *
 * Serves SITE_DIR under BASEURL, e.g. /conf/talks/x/ -> SITE_DIR/talks/x/index.html.
 * Usage: `node test/support/serve.js [port]`
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { BASEURL, SITE_DIR } from "./build.js";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const DEFAULT_PORT = 4010;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

const resolveFile = (urlPath) => {
  if (!urlPath.startsWith(BASEURL)) {
    return null;
  }

  // Strip baseurl and prevent path traversal
  const relPath = normalize(decodeURIComponent(urlPath.slice(BASEURL.length))).replace(/^(\.\.[/\\])+/, "");
  let file = join(SITE_DIR, relPath);

  try {
    if (statSync(file).isDirectory()) {
      file = join(file, "index.html");
    }
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
};

const port = Number(process.argv[2]) || DEFAULT_PORT;

createServer((req, res) => {
  const file = resolveFile(new URL(req.url, "http://localhost").pathname);
  if (!file) {
    res.writeHead(HTTP_NOT_FOUND).end("Not found");
    return;
  }

  res.writeHead(HTTP_OK, { "Content-Type": MIME_TYPES[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Serving ${SITE_DIR} at http://127.0.0.1:${port}${BASEURL}/`));
