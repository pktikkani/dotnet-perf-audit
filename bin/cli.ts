import { Command } from 'commander';
import { run } from '../src/index.js';
import type { CliOptions } from '../src/types/index.js';

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

    await run(path, options);
  });

program.parse();
