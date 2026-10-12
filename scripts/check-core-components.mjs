#!/usr/bin/env node
// Keep native UI controls in shared primitives, not in app screens.
// Parse JSX so comments, text, and allowlist markers cannot hide bypasses.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projects = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "../.."));
const require = createRequire(join(projects, "digitalmaktab-spa-core/package.json"));
const ts = require("typescript");
const tags = new Set(["table", "input", "button", "select", "textarea", "img", "form", "dialog"]);
const failures = [];
let scanned = 0;

function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    scanned += 1;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        const className = node.attributes.properties.find((attribute) =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "className" &&
          attribute.initializer)?.initializer?.getText(source) ?? "";
        const rawAlert = tag === "div" && /\balert(?:\s|["'`-])/.test(className);
        const rawBadge = tag === "span" && /\bbadge\b/.test(className);
        const rawButtonLink = (tag === "a" || tag === "Link") && /\bbtn\b/.test(className);
        if (tags.has(tag) || rawAlert || rawBadge || rawButtonLink) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          failures.push(`${file}:${line}: use a shared component instead of ${rawAlert ? "alert markup" : rawBadge ? "badge markup" : rawButtonLink ? "button-link markup" : `<${tag}>`}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

for (const name of readdirSync(projects)) {
  if (name !== "digitalmaktab-spa" && !name.startsWith("digitalmaktab-spa-country-")) continue;
  const source = join(projects, name, "src");
  if (existsSync(source)) scan(source);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Core component reuse: ${scanned} source files checked, no native UI bypasses.`);
}
