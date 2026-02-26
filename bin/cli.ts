import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { run } from '../src/index.js';
import type { CliOptions } from '../src/types/index.js';

const PROJECT_MARKERS = ['*.sln', '*.csproj', '*.fsproj'];

const SEARCH_DIRS = [
  'Documents', 'Projects', 'code', 'repos', 'src', 'dev', 'Work', 'WebstormProjects', 'RiderProjects',
];

/** Check if user explicitly passed a path arg (vs commander's default '.') */
function wasPathExplicitlyProvided(): boolean {
  const raw = process.argv.slice(2);
  const flagsWithValue = new Set(['-f', '--format', '-o', '--output', '--severity']);
  const bareFlags = new Set(['--no-stream', '--ci', '-V', '--version', '-h', '--help']);

  let i = 0;
  while (i < raw.length) {
    const arg = raw[i];
    if (flagsWithValue.has(arg)) {
      i += 2;
    } else if (bareFlags.has(arg)) {
      i += 1;
    } else {
      return true;
    }
  }
  return false;
}

/** Find .NET project directories under common source folders */
function discoverProjects(): string[] {
  const home = homedir();
  const existingDirs = SEARCH_DIRS
    .map((d) => join(home, d))
    .filter((d) => existsSync(d));

  if (existingDirs.length === 0) return [];

  const hasFd = spawnSync('which', ['fd'], { stdio: 'pipe' }).status === 0;
  let dirs: string[] = [];

  if (hasFd) {
    const patterns = PROJECT_MARKERS.map((g) => g.replace('*.', '.*\\.'));
    const result = spawnSync('fd', [
      '--type', 'f',
      '--max-depth', '4',
      '--regex', `(${patterns.join('|')})$`,
      ...existingDirs,
    ], { stdio: 'pipe', encoding: 'utf-8', timeout: 10_000 });

    if (result.status === 0 && result.stdout) {
      dirs = result.stdout.trim().split('\n').filter(Boolean)
        .map((f) => join(f, '..'));
    }
  } else {
    const nameArgs = PROJECT_MARKERS.flatMap((m, i) => [
      ...(i > 0 ? ['-o'] : []),
      '-name', m,
    ]);
    const result = spawnSync('find', [
      ...existingDirs,
      '-maxdepth', '4',
      '-type', 'f',
      '(', ...nameArgs, ')',
    ], { stdio: 'pipe', encoding: 'utf-8', timeout: 15_000 });

    if (result.status === 0 && result.stdout) {
      dirs = result.stdout.trim().split('\n').filter(Boolean)
        .map((f) => join(f, '..'));
    }
  }

  return [...new Set(dirs.map((d) => resolve(d)))].sort();
}

/** Spawn fzf with project list, return selected path or null */
function pickWithFzf(projects: string[]): string | null {
  const result = spawnSync('fzf', [
    '--height', '40%',
    '--reverse',
    '--prompt', '.NET project ❯ ',
    '--header', 'Select a .NET project to audit',
    '--preview', 'ls -1 --color=always {}',
    '--preview-window', 'right:40%',
  ], {
    input: projects.join('\n'),
    stdio: ['pipe', 'pipe', 'inherit'],
    encoding: 'utf-8',
    timeout: 60_000,
  });

  if (result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return null;
}

/** Fallback: @clack/prompts select */
async function pickWithClack(projects: string[]): Promise<string | null> {
  const clack = await import('@clack/prompts');
  const home = homedir();

  const selected = await clack.select({
    message: 'Select a .NET project to audit',
    options: projects.map((p) => ({
      label: p.replace(home, '~'),
      value: p,
    })),
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Cancelled');
    return null;
  }
  return selected as string;
}

/** Interactive project picker — fzf → clack fallback → '.' */
async function selectProject(isCi: boolean): Promise<string> {
  if (isCi || !process.stdout.isTTY) return '.';

  const projects = discoverProjects();
  if (projects.length === 0) return '.';

  const hasFzf = spawnSync('which', ['fzf'], { stdio: 'pipe' }).status === 0;

  if (hasFzf) {
    const selected = pickWithFzf(projects);
    if (selected) return selected;
    process.exit(0);
  }

  const selected = await pickWithClack(projects);
  if (selected) return selected;
  process.exit(0);
}

const program = new Command();

program
  .name('dotnet-perf-audit')
  .description('A beautiful .NET performance analysis CLI powered by Claude AI')
  .version('1.0.0')
  .argument('[path]', 'Path to .NET project/solution directory', '.')
  .option('-f, --format <format>', 'Output format: terminal, markdown, html, json', 'terminal')
  .option('-o, --output <file>', 'Output file path (for markdown/html/json)')
  .option('--severity <level>', 'Minimum severity: critical, warning, suggestion', 'suggestion')
  .option('--no-stream', 'Disable streaming output')
  .option('--ci', 'CI mode: exit code 1 if critical findings, minimal output', false)
  .action(async (path: string, opts: Record<string, unknown>) => {
    const options: CliOptions = {
      format: opts.format as CliOptions['format'],
      output: opts.output as string | undefined,
      severity: opts.severity as CliOptions['severity'],
      stream: opts.stream !== false,
      ci: opts.ci === true,
    };

    let targetPath = path;
    if (!wasPathExplicitlyProvided()) {
      targetPath = await selectProject(options.ci);
    }

    await run(targetPath, options);
  });

program.parse();
