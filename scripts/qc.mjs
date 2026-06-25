import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serious = [];
const warnings = [];
const htmlFiles = walk(root)
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
  .sort();
const allFiles = new Set(walk(root).map((file) => path.relative(root, file).split(path.sep).join("/")));
const usedFiles = new Set();
const internalLinks = new Map();

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

if (!htmlFiles.length) {
  serious.push("No HTML files were found.");
}

for (const file of htmlFiles) {
  const rel = relative(file);
  const html = fs.readFileSync(file, "utf8");
  const ids = collectIds(html);

  checkHtmlShell(rel, html);
  checkMetadata(rel, html);
  checkAccessibilitySmoke(rel, html);
  checkLanguagePaths(rel, html);
  checkPlaceholders(rel, html);
  checkTagBalance(rel, html);
  collectReferences(file, rel, html, ids);
}

checkCssReferences();
checkDeadFiles();

printResults();

if (serious.length) {
  process.exitCode = 1;
}

function walk(dir) {
  const ignored = new Set([".git", "node_modules", ".DS_Store"]);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function checkHtmlShell(rel, html) {
  if (!/^<!doctype html>/i.test(html.trim())) {
    serious.push(`${rel}: missing <!doctype html>.`);
  }
  if (!/<html\b[^>]*\blang=["'][a-z-]+["'][^>]*>/i.test(html)) {
    serious.push(`${rel}: missing html lang attribute.`);
  }
  for (const tag of ["head", "body", "main"]) {
    if (!new RegExp(`<${tag}\\b`, "i").test(html)) {
      serious.push(`${rel}: missing <${tag}> element.`);
    }
  }
  if (!/<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)) {
    serious.push(`${rel}: missing mobile viewport meta tag.`);
  }
}

function checkMetadata(rel, html) {
  const title = matchContent(html, /<title>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "name", "description");
  if (!title || title.length < 10) {
    serious.push(`${rel}: missing or too-short SEO title.`);
  }
  if (!description || description.length < 40) {
    serious.push(`${rel}: missing or too-short meta description.`);
  }

  for (const property of ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image"]) {
    if (!metaContent(html, "property", property)) {
      serious.push(`${rel}: missing Open Graph tag ${property}.`);
    }
  }

  if (!/<link\b[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["']/i.test(html)) {
    serious.push(`${rel}: missing canonical link.`);
  }
}

function checkAccessibilitySmoke(rel, html) {
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(img[0])) {
      serious.push(`${rel}: image is missing alt text: ${trimTag(img[0])}`);
    }
  }

  for (const button of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const label = stripTags(button[1]).trim();
    if (!label && !/\baria-label=["'][^"']+["']/i.test(button[0])) {
      serious.push(`${rel}: button has no visible label or aria-label.`);
    }
  }

  if (/<form\b/i.test(html)) {
    const inputs = [...html.matchAll(/<(input|textarea|select)\b[^>]*>/gi)]
      .map((match) => match[0])
      .filter((tag) => !/\btype=["'](?:hidden|submit|button|reset)["']/i.test(tag));
    for (const input of inputs) {
      const id = attr(input, "id");
      const name = attr(input, "name") || id || trimTag(input);
      const hasLabel = id && new RegExp(`<label\\b[^>]*for=["']${escapeRegExp(id)}["']`, "i").test(html);
      const inputIndex = html.indexOf(input);
      const hasWrappingLabel = isWrappedByLabel(html, inputIndex);
      if (!hasLabel && !hasWrappingLabel && !/\baria-label=["'][^"']+["']/i.test(input) && !/\bplaceholder=["'][^"']+["']/i.test(input)) {
        serious.push(`${rel}: form field "${name}" has no detectable label.`);
      }
    }
  }
}

function checkLanguagePaths(rel, html) {
  const lang = attr(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang");
  const isEnglishPath = rel.startsWith("en/");
  if (isEnglishPath && lang !== "en") {
    serious.push(`${rel}: English path should use lang="en".`);
  }
  if (!isEnglishPath && rel !== "404.html" && lang !== "nl") {
    serious.push(`${rel}: Dutch path should use lang="nl".`);
  }

  const alternateMatches = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)];
  const hasNl = alternateMatches.some((tag) => /\bhreflang=["']nl["']/i.test(tag[0]));
  const hasEn = alternateMatches.some((tag) => /\bhreflang=["']en["']/i.test(tag[0]));
  if (!["404.html"].includes(rel) && (!hasNl || !hasEn)) {
    warnings.push(`${rel}: missing nl/en alternate hreflang pair.`);
  }
}

function checkPlaceholders(rel, html) {
  const allowedLaunchPlaceholders = new Set([
    "TODO_REAL_PHONE_NUMBER",
    "TODO_REAL_PHONE_E164",
    "TODO_REAL_WHATSAPP_NUMBER",
    "TODO_FORMSPREE_ID",
    "TODO_GTM_CONTAINER_ID"
  ]);

  for (const token of html.matchAll(/\b(?:TODO_[A-Z0-9_]+|\[[A-Z0-9_]+\])\b/g)) {
    if (!allowedLaunchPlaceholders.has(token[0])) {
      serious.push(`${rel}: unresolved placeholder token ${token[0]}.`);
    }
  }
}

function checkTagBalance(rel, html) {
  const stack = [];
  const tagPattern = /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const raw = match[0];
    const tag = match[1].toLowerCase();
    if (raw.startsWith("<!") || raw.startsWith("<?") || voidTags.has(tag) || raw.endsWith("/>")) continue;
    if (raw.startsWith("</")) {
      const previous = stack.pop();
      if (previous !== tag) {
        serious.push(`${rel}: possible HTML nesting issue near ${trimTag(raw)}.`);
        return;
      }
    } else {
      stack.push(tag);
    }
  }
  if (stack.length) {
    serious.push(`${rel}: unclosed HTML tag <${stack.at(-1)}>.`);
  }
}

function collectReferences(file, rel, html, ids) {
  const attrs = [...html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const value of attrs) {
    if (isExternalOrSpecial(value)) continue;
    const [targetPath, hash] = value.split("#");
    if (!targetPath && hash) {
      if (!ids.has(hash)) serious.push(`${rel}: hash link #${hash} has no matching id.`);
      continue;
    }

    const resolved = resolveLocal(file, targetPath);
    const resolvedRel = relative(resolved);
    usedFiles.add(resolvedRel);

    if (!fs.existsSync(resolved)) {
      serious.push(`${rel}: missing local target ${value}.`);
      continue;
    }

    if (hash && resolved.endsWith(".html")) {
      const targetHtml = fs.readFileSync(resolved, "utf8");
      const targetIds = internalLinks.get(resolvedRel) || collectIds(targetHtml);
      internalLinks.set(resolvedRel, targetIds);
      if (!targetIds.has(hash)) {
        serious.push(`${rel}: link ${value} points to a missing section id.`);
      }
    }
  }
}

function checkCssReferences() {
  for (const cssFile of walk(root).filter((file) => file.endsWith(".css"))) {
    const rel = relative(cssFile);
    usedFiles.add(rel);
    const css = fs.readFileSync(cssFile, "utf8");
    for (const match of css.matchAll(/url\((?!['"]?data:)(['"]?)([^'")]+)\1\)/gi)) {
      const value = match[2].split("#")[0].split("?")[0];
      if (!value || isExternalOrSpecial(value)) continue;
      const resolved = resolveLocal(cssFile, value);
      usedFiles.add(relative(resolved));
      if (!fs.existsSync(resolved)) {
        serious.push(`${rel}: missing CSS asset ${value}.`);
      }
    }

    for (const width of css.matchAll(/\bwidth:\s*(\d{3,})px/g)) {
      const px = Number(width[1]);
      if (px > 430 && !css.slice(Math.max(0, width.index - 80), width.index + 80).includes("max-width")) {
        warnings.push(`${rel}: fixed width ${px}px may need a mobile check.`);
      }
    }
  }
}

function checkDeadFiles() {
  const protectedFiles = new Set([
    "README.md",
    "robots.txt",
    "sitemap.xml",
    "package.json",
    "assets/logo-vsr-512.png",
    ".github/workflows/quality-control.yml",
    "scripts/qc.mjs",
    "scripts/lighthouse-baseline.mjs"
  ]);
  const assetExtensions = /\.(png|jpe?g|gif|webp|svg|ico|css|js)$/i;

  for (const file of allFiles) {
    if (protectedFiles.has(file)) continue;
    if (file.startsWith(".github/") || file.startsWith("scripts/")) continue;
    if (file.endsWith(".html")) continue;
    if (!assetExtensions.test(file)) continue;
    if (!usedFiles.has(file)) {
      warnings.push(`${file}: not referenced by HTML or CSS.`);
    }
  }
}

function collectIds(html) {
  return new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
}

function resolveLocal(fromFile, value) {
  const clean = decodeURIComponent(value.split("?")[0].split("#")[0]);
  if (clean.startsWith("/")) return path.join(root, clean.replace(/^\/+/, ""));
  return path.resolve(path.dirname(fromFile), clean);
}

function isExternalOrSpecial(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) || value.startsWith("data:");
}

function metaContent(html, key, value) {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${key}=["']${escapeRegExp(value)}["'])[^>]*>`, "i"))?.[0] || "";
  return attr(tag, "content").trim();
}

function matchContent(html, pattern) {
  return stripTags(html.match(pattern)?.[1] || "").trim();
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`, "i"));
  return match?.[2] || match?.[3] || "";
}

function isWrappedByLabel(html, index) {
  if (index < 0) return false;
  const before = html.slice(0, index);
  const lastOpen = before.lastIndexOf("<label");
  const lastClose = before.lastIndexOf("</label>");
  const nextClose = html.indexOf("</label>", index);
  return lastOpen > lastClose && nextClose > index;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, " ");
}

function trimTag(tag) {
  return tag.replace(/\s+/g, " ").slice(0, 140);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printResults() {
  console.log(`Quality control scanned ${htmlFiles.length} HTML pages.`);
  if (serious.length) {
    console.log(`\nSerious issues (${serious.length}):`);
    serious.forEach((item) => console.log(`- ${item}`));
  } else {
    console.log("\nSerious issues: none");
  }

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((item) => console.log(`- ${item}`));
  } else {
    console.log("\nWarnings: none");
  }
}
