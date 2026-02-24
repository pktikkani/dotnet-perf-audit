import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import * as clack from '@clack/prompts';
import chalk from 'chalk';
import { showBanner } from './ui/banner.js';
import { createSpinner, logStep } from './ui/progress.js';
import { scanProjects } from './scanner/project-scanner.js';
import { scanFiles } from './scanner/file-scanner.js';
import { analyze } from './analyzer/analyzer.js';
import { renderTerminalReport } from './reporter/terminal-reporter.js';
import { generateMarkdownReport } from './reporter/markdown-reporter.js';
import { generateHtmlReport } from './reporter/html-reporter.js';
import type { AnalysisReport, CliOptions, ProjectInfo } from './types/index.js';

export async function run(targetPath: string, options: CliOptions): Promise<void> {
  const rootPath = resolve(targetPath);

  if (!options.ci) {
    showBanner();
  }

  // Step 1: Scan for projects
  const scanSpinner = createSpinner('Scanning for .NET projects...');
  scanSpinner.start();

  let projects: ProjectInfo[];
  try {
    projects = await scanProjects(rootPath);
    scanSpinner.succeed(chalk.dim(`Found ${projects.length} project(s)`));
  } catch (err) {
    scanSpinner.fail('No .NET projects found');
    console.error(chalk.red(`\n  ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }

  // Step 2: Select project if multiple
  let project: ProjectInfo;
  if (projects.length === 1) {
    project = projects[0];
  } else if (options.ci) {
    // In CI mode, analyze the first project
    project = projects[0];
  } else {
    const selected = await clack.select({
      message: 'Multiple projects found. Which one to analyze?',
      options: projects.map((p) => ({
        label: p.name,
        value: p.name,
        hint: `.NET ${p.dotnetVersion}`,
      })),
    });

    if (clack.isCancel(selected)) {
      clack.cancel('Cancelled');
      process.exit(0);
    }

    project = projects.find((p) => p.name === selected)!;
  }

  logStep('Project', `${project.name} (.NET ${project.dotnetVersion})`);

  if (project.packages.length > 0) {
    logStep('Packages', project.packages.map((p) => p.name).join(', '));
  }

  // Step 3: Scan files
  const fileSpinner = createSpinner('Discovering C# files...');
  fileSpinner.start();

  const files = await scanFiles(rootPath);
  fileSpinner.succeed(chalk.dim(`Found ${files.length} C# file(s)`));

  if (files.length === 0) {
    console.log(chalk.yellow('\n  No analyzable C# files found.'));
    process.exit(0);
  }

  // Log categories found
  const categories = new Map<string, number>();
  for (const f of files) {
    categories.set(f.category, (categories.get(f.category) ?? 0) + 1);
  }
  const catSummary = Array.from(categories.entries())
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');
  logStep('Files', catSummary);

  // Step 4: Analyze with Claude
  const analyzeSpinner = createSpinner('Analyzing code with Claude...');
  analyzeSpinner.start();

  let report: AnalysisReport;
  try {
    report = await analyze(project, files, {
      stream: options.stream,
      onBatchStart: (batch, total) => {
        if (total > 1) {
          analyzeSpinner.text = `Analyzing batch ${batch}/${total}...`;
        }
      },
    });
    analyzeSpinner.succeed(chalk.dim(`Analysis complete in ${report.duration.toFixed(1)}s`));
  } catch (err) {
    analyzeSpinner.fail('Analysis failed');
    console.error(chalk.red(`\n  ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }

  // Step 5: Filter by minimum severity
  if (options.severity !== 'suggestion') {
    const severityOrder = ['critical', 'warning', 'suggestion', 'good'];
    const minIndex = severityOrder.indexOf(options.severity);
    report.findings = report.findings.filter((f) => {
      const index = severityOrder.indexOf(f.severity);
      return index <= minIndex || f.severity === 'good';
    });
  }

  // Step 6: Output report
  switch (options.format) {
    case 'terminal':
      renderTerminalReport(report);
      break;

    case 'markdown': {
      const md = generateMarkdownReport(report);
      if (options.output) {
        await writeFile(options.output, md, 'utf-8');
        console.log(chalk.dim(`\n  Report saved: ${options.output}`));
      } else {
        console.log(md);
      }
      break;
    }

    case 'html': {
      const html = await generateHtmlReport(report);
      const outputPath = options.output ?? 'perf-report.html';
      await writeFile(outputPath, html, 'utf-8');
      console.log(chalk.dim(`\n  Report saved: ${outputPath}`));
      break;
    }

    case 'json': {
      const json = JSON.stringify(report, null, 2);
      if (options.output) {
        await writeFile(options.output, json, 'utf-8');
        console.log(chalk.dim(`\n  Report saved: ${options.output}`));
      } else {
        console.log(json);
      }
      break;
    }
  }

  // Also save HTML report by default in terminal mode
  if (options.format === 'terminal' && !options.ci) {
    try {
      const html = await generateHtmlReport(report);
      await writeFile('perf-report.html', html, 'utf-8');
      console.log(chalk.dim(`  Report saved: ./perf-report.html`));
    } catch {
      // Non-critical — don't fail if template is missing
    }
  }

  // CI mode exit code
  if (options.ci && report.summary.critical > 0) {
    process.exit(1);
  }
}
