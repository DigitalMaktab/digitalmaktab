#!/usr/bin/env node
// Local read-only audit every 30 minutes. Stops on process termination/reboot.
// Start: node scripts/watch-pdf-exports.cjs
// Stop:  node scripts/watch-pdf-exports.cjs --stop
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const artifacts = process.env.PDF_AUDIT_ARTIFACTS || path.join(os.tmpdir(), 'digitalmaktab-pdf-audit');
fs.mkdirSync(artifacts, { recursive: true });
const pidFile = path.join(artifacts, 'watcher.pid');
const statusFile = path.join(artifacts, 'watcher.json');
const stopFile = path.join(artifacts, 'watcher.stop');
let existing = null;
try { existing = Number(fs.readFileSync(pidFile, 'utf8')); } catch { /* First start. */ }
if (process.argv.includes('--stop')) {
  if (existing) { fs.writeFileSync(stopFile, String(existing)); console.log('PDF audit watcher stop requested.'); }
  else console.log('No PDF audit watcher is running.');
  process.exit(0);
}
if (existing) {
  try { process.kill(existing, 0); console.log(`PDF audit watcher already running (PID ${existing}).`); process.exit(0); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}
fs.writeFileSync(pidFile, String(process.pid));
if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
const interval = 30 * 60 * 1000;
let child = null;
let timer = null;
let state = { pid: process.pid, intervalMinutes: 30, startedAt: new Date().toISOString() };
const save = () => fs.writeFileSync(statusFile, JSON.stringify(state, null, 2) + '\n');
const run = () => {
  const started = Date.now();
  state = { ...state, status: 'running', lastStartedAt: new Date(started).toISOString(), nextRunAt: new Date(started + interval).toISOString() };
  save();
  const output = fs.createWriteStream(path.join(artifacts, 'latest-run.log'));
  child = spawn(process.execPath, [path.join(__dirname, 'check-pdf-exports.cjs')], {
    env: { ...process.env, PDF_AUDIT_ARTIFACTS: artifacts }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(output, { end: false });
  child.stderr.pipe(output, { end: false });
  const finish = (code, error) => {
    if (!child) return;
    child = null;
    if (error) output.write(String(error) + '\n');
    output.end();
    state = { ...state, status: code === 0 ? 'passed' : 'failed', lastFinishedAt: new Date().toISOString(), exitCode: code };
    save();
    console.log(`${state.lastFinishedAt}: PDF audit ${state.status}. Next check ${state.nextRunAt}. Results: ${artifacts}`);
    timer = setTimeout(run, Math.max(0, started + interval - Date.now()));
  };
  child.on('error', error => finish(1, error));
  child.on('close', code => finish(code ?? 1));
};
const stop = () => {
  clearTimeout(timer);
  fs.unwatchFile(stopFile);
  child?.kill('SIGTERM');
  state = { ...state, status: 'stopped', stoppedAt: new Date().toISOString() };
  save();
  if (fs.readFileSync(pidFile, 'utf8') === String(process.pid)) fs.unlinkSync(pidFile);
  process.exit(0);
};
fs.watchFile(stopFile, { interval: 1000 }, () => {
  if (fs.existsSync(stopFile) && fs.readFileSync(stopFile, 'utf8') === String(process.pid)) stop();
});
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log(`Starting local PDF audit every 30 minutes (PID ${process.pid}). Stop with: node scripts/watch-pdf-exports.cjs --stop`);
run();
