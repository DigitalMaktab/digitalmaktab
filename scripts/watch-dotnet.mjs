#!/usr/bin/env node
// watch-dotnet.mjs — watch Core + Country.Afghanistan .cs sources
// and run sync-dotnet.sh whenever something changes. Same debouncing
// strategy as watch-spa.mjs; writes to bin/ and obj/ are ignored so
// the sync's own build output doesn't retrigger it.
//
// Usage:
//   node scripts/watch-dotnet.mjs
// Ctrl+C to stop.
//
// After each sync completes you still need to Ctrl+C and restart
// `dotnet run` in digitalmaktab-api — Kestrel + Npgsql cache the
// loaded assemblies and dotnet-watch doesn't detect transitive
// NuGet DLL swaps.

import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROJECTS = resolve(ROOT, "..");

const WATCHED = [
  join(PROJECTS, "digitalmaktab-core/src"),
  join(PROJECTS, "digitalmaktab-country-afghanistan"),
];
const SYNC_SCRIPT = join(ROOT, "scripts/sync-dotnet.sh");

// Ignore bin/, obj/, .DS_Store, VS temp files, and the sync's own
// output path.
const IGNORE =
  /(?:\/(bin|obj|\.vs|node_modules)\/|\.(DS_Store|swp|tmp|user)$|~$)/;

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
      console.log(
        `[${new Date().toLocaleTimeString()}] sync ok · restart 'dotnet run' in digitalmaktab-api to pick up the new DLLs`
      );
    }
    if (pending) runSync();
  });
};

const schedule = (filename) => {
  if (filename && IGNORE.test(filename)) return;
  // 500ms — .NET edits often come in bursts (rename refactors touch
  // dozens of files) and clean+build+pack is slower than the SPA
  // path so we want fewer wasted runs.
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(runSync, 500);
};

console.log(`watching .NET sources in:`);
WATCHED.forEach((p) => console.log(`  ${p}`));
console.log(`sync script: ${SYNC_SCRIPT}`);
console.log(`press Ctrl+C to stop\n`);

for (const dir of WATCHED) {
  watch(dir, { recursive: true }, (eventType, filename) => {
    schedule(filename);
  });
}
