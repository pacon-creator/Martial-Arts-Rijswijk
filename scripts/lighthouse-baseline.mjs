import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const port = Number(process.env.QC_LIGHTHOUSE_PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", origin);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);
  const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? path.join(filePath, "index.html")
    : filePath;

  if (!finalPath.startsWith(root) || !fs.existsSync(finalPath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": contentType(finalPath) });
  fs.createReadStream(finalPath).pipe(response);
});

try {
  await listen(server, port);

  const result = spawnSync(
    "npx",
    [
      "--yes",
      "lighthouse",
      `${origin}/`,
      "--quiet",
      "--chrome-flags=--headless --no-sandbox",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${path.join(reportDir, "lighthouse-home.json")}`
    ],
    { cwd: root, encoding: "utf8", stdio: "pipe" }
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exitCode = result.status || 1;
  } else {
    const report = JSON.parse(fs.readFileSync(path.join(reportDir, "lighthouse-home.json"), "utf8"));
    const scores = Object.fromEntries(
      Object.entries(report.categories).map(([key, category]) => [key, Math.round(category.score * 100)])
    );
    console.log("Lighthouse baseline:", scores);

    const failures = [];
    if (scores.performance < 50) failures.push(`performance ${scores.performance} < 50`);
    if (scores.accessibility < 75) failures.push(`accessibility ${scores.accessibility} < 75`);
    if (scores["best-practices"] < 70) failures.push(`best-practices ${scores["best-practices"]} < 70`);
    if (scores.seo < 80) failures.push(`seo ${scores.seo} < 80`);

    if (failures.length) {
      console.error(`Serious Lighthouse baseline failure: ${failures.join(", ")}`);
      process.exitCode = 1;
    }
  }
} finally {
  server.close();
}

function listen(serverInstance, requestedPort) {
  return new Promise((resolve, reject) => {
    serverInstance.once("error", reject);
    serverInstance.listen(requestedPort, "127.0.0.1", () => resolve());
  });
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".xml": "application/xml"
  }[extension] || "application/octet-stream";
}
