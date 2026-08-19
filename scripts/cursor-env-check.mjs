/**
 * cursor-env-check.mjs — static validation of .cursor/environment.json and the
 * Dockerfile it builds.
 *
 * The failure mode this exists to catch: nothing in this repo builds the Cursor
 * background-agent image, so a broken one is invisible here and only shows up as
 * "the Cursor agent won't start" — which is what happened. The image shipped
 * with no `FROM` line for weeks; every environment build died at parse time and
 * no gate said a word.
 *
 * These are the checks a `docker build` would fail on, minus the daemon:
 *   - environment.json parses
 *   - a referenced Dockerfile exists, and ANY .cursor/Dockerfile present — even
 *     one environment.json does not reference — starts with FROM (ARG before
 *     FROM is legal and allowed). An unreferenced one is checked because it is
 *     opt-in, not dead: the day someone wires it back up is the wrong day to
 *     discover it never parsed.
 *   - no CMD/ENTRYPOINT — Cursor supplies the container's long-running command
 *   - the build context stays inside the repo
 *
 * A `build`-less environment.json is valid and is what this repo ships: Cursor
 * boots its default machine and runs `install`. That is not a finding.
 *
 * Usage: node scripts/cursor-env-check.mjs   (exit 1 = broken)
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const CURSOR_DIR = resolve(process.cwd(), '.cursor');
const ENV_FILE = resolve(CURSOR_DIR, 'environment.json');
const problems = [];

if (!existsSync(ENV_FILE)) {
  console.log('cursor-env-check: no .cursor/environment.json — nothing to check');
  process.exit(0);
}

let env;
try {
  env = JSON.parse(readFileSync(ENV_FILE, 'utf8'));
} catch (err) {
  console.error(`cursor-env-check: .cursor/environment.json is not valid JSON — ${err.message}`);
  process.exit(1);
}

const referenced = env.build?.dockerfile ? resolve(CURSOR_DIR, env.build.dockerfile) : null;
const defaultDockerfile = resolve(CURSOR_DIR, 'Dockerfile');

if (referenced && !existsSync(referenced)) {
  problems.push(`build.dockerfile points at ${relative(process.cwd(), referenced)}, which does not exist`);
}

// Check the referenced Dockerfile, or an unreferenced .cursor/Dockerfile sitting
// there as the opt-in image.
const dockerfiles = [...new Set([referenced, defaultDockerfile].filter((f) => f && existsSync(f)))];

for (const dockerfile of dockerfiles) {
  const instructions = readFileSync(dockerfile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    // A backslash-continued line's tail is an argument, not an instruction.
    .reduce((acc, line) => {
      if (acc.continuing) {
        acc.continuing = line.endsWith('\\');
        return acc;
      }
      acc.continuing = line.endsWith('\\');
      acc.list.push(line);
      return acc;
    }, { list: [], continuing: false })
    .list.map((line) => line.split(/\s+/)[0].toUpperCase());

  const firstStage = instructions.find((word) => word !== 'ARG');
  if (firstStage !== 'FROM') {
    problems.push(
      `${relative(process.cwd(), dockerfile)} starts with ${firstStage ?? 'nothing'}, not FROM — ` +
        'Cursor runs a plain `docker build`, it does not prepend a base image',
    );
  }
  for (const banned of ['CMD', 'ENTRYPOINT']) {
    if (instructions.includes(banned)) {
      problems.push(`${relative(process.cwd(), dockerfile)} declares ${banned}; Cursor supplies the container command`);
    }
  }
}

if (env.build?.dockerfile) {
  const context = env.build.context ?? '.';
  const contextRoot = env.build.context === undefined ? CURSOR_DIR : resolve(CURSOR_DIR, context);
  const outside = relative(process.cwd(), contextRoot).startsWith('..');
  if (outside) {
    problems.push(`build.context "${context}" resolves outside the repository`);
  }
}

if (typeof env.install === 'string') {
  const script = env.install.match(/(?:^|\s)\.\/(\S+\.(?:sh|mjs|js))/)?.[1];
  if (script && !existsSync(resolve(process.cwd(), script))) {
    problems.push(`install runs ./${script}, which does not exist`);
  }
}

if (problems.length) {
  console.error('cursor-env-check: the Cursor agent environment would fail to build\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const notes = [];
if (!env.build?.dockerfile && !env.snapshot) {
  notes.push('no `build` (Cursor default machine + install) — a Docker build in the dashboard log means the saved copy is stale');
}
for (const dockerfile of dockerfiles) {
  const bytes = Buffer.byteLength(readFileSync(dockerfile));
  const role = referenced && dockerfile === referenced ? 'referenced' : 'opt-in, unreferenced';
  notes.push(`${relative(process.cwd(), dockerfile)} is ${bytes} bytes (${role}) — dashboard \`transferring dockerfile: NNNB\` must match`);
}

console.log('cursor-env-check: .cursor environment looks buildable');
for (const note of notes) console.log(`  ${note}`);
