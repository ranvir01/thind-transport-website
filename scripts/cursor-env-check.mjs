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
 *   - environment.json parses and declares either a build or a snapshot
 *   - the referenced Dockerfile exists and its first instruction is FROM
 *     (ARG before FROM is legal and allowed)
 *   - no CMD/ENTRYPOINT — Cursor supplies the container's long-running command
 *   - the build context stays inside the repo
 *
 * Usage: node scripts/cursor-env-check.mjs   (exit 1 = broken)
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

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

if (!env.build?.dockerfile && !env.snapshot) {
  problems.push('environment.json declares neither `build.dockerfile` nor `snapshot`');
}

if (env.build?.dockerfile) {
  const dockerfile = resolve(CURSOR_DIR, env.build.dockerfile);
  if (!existsSync(dockerfile)) {
    problems.push(`build.dockerfile points at ${relative(process.cwd(), dockerfile)}, which does not exist`);
  } else {
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

console.log('cursor-env-check: .cursor environment looks buildable');
