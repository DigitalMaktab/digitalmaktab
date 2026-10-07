#!/usr/bin/env node
// watch-spa.mjs — watch spa-core and spa-country-afghanistan source,
// run sync-spa.sh whenever something changes. One-command background
// workflow: start this and edit either package, saves land in the
// shell's node_modules automatically; CRA re-bundles on the next
// mtime bump; browser just hard-refreshes.
//
// Usage:
//   node scripts/watch-spa.mjs
// Ctrl+C to stop.
//
// Dependency-free — uses Node's native fs.watch recursive mode
// (macOS + Windows out of the box, Linux via inotify-recursive).

import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROJECTS = resolve(ROOT, "..");

const WATCHED = [
  join(PROJECTS, "digitalmaktab-spa-core/src"),
  join(PROJECTS, "digitalmaktab-spa-country-afghanistan/src"),
];
const SYNC_SCRIPT = join(ROOT, "scripts/sync-spa.sh");

// Ignore noise: build output, cached snapshots, .DS_Store, swap files.
const IGNORE = /(?:\.(DS_Store|swp|tmp)$|\/dist\/|\/node_modules\/|~$)/;

let pending = false;
let running = false;
let debounceHandle = null;

const runSync = () => {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  pending = false;
  console.log(`[${new Date().toLocaleTimeString()}] change detected — syncing…`);
  const child = spawn(SYNC_SCRIPT, [], { stdio: "inherit" });
  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      console.error(`[${new Date().toLocaleTimeString()}] sync FAILED (exit ${code})`);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] sync ok · waiting for next change`);
    }
    if (pending) runSync();
  });
};

const schedule = (filename) => {
  if (filename && IGNORE.test(filename)) return;
  // Debounce the burst of events a single save (or git checkout)
  // produces; webpack / tsc output 10+ writes per compile and we
  // only want one sync at the end.
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(runSync, 300);
};

console.log(`watching for src changes in:`);
WATCHED.forEach((p) => console.log(`  ${p}`));
console.log(`sync script: ${SYNC_SCRIPT}`);
console.log(`press Ctrl+C to stop\n`);

for (const dir of WATCHED) {
  watch(dir, { recursive: true }, (eventType, filename) => {
    schedule(filename);
  });
}
