import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import type { AnalysisReport, Finding, Severity } from '../types/index.js';
import { colors, icons, severityColor, severityIcon, progressBar } from '../ui/theme.js';
import { showCompletionBanner } from '../ui/banner.js';

export function renderTerminalReport(report: AnalysisReport): void {
  renderProjectInfo(report);
  renderHealthScore(report.summary.score);
  showCompletionBanner(report.summary.score);

  const grouped = groupBySeverity(report.findings);

  if (grouped.critical.length > 0) {
    renderSection('CRITICAL', grouped.critical, 'critical');
  }
  if (grouped.warning.length > 0) {
    renderSection('WARNINGS', grouped.warning, 'warning');
  }
  if (grouped.suggestion.length > 0) {
    renderSection('SUGGESTIONS', grouped.suggestion, 'suggestion');
  }
  if (grouped.good.length > 0) {
    renderGoodPatterns(grouped.good);
  }

  renderSummaryTable(report);
}

function renderProjectInfo(report: AnalysisReport): void {
  const info = [
    `${chalk.bold('Project:')}  ${report.project.name}`,
    `${chalk.bold('Framework:')} .NET ${report.project.dotnetVersion}`,
    `${chalk.bold('Files:')}    ${report.summary.filesAnalyzed} analyzed`,
    `${chalk.bold('Duration:')} ${report.duration.toFixed(1)}s`,
  ].join('\n');

  const box = boxen(info, {
    padding: { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: 'gray',
    dimBorder: true,
  });

  console.log(box);
}

function renderHealthScore(score: number): void {
  const bar = progressBar(score, 24);
  let scoreColor: chalk.ChalkInstance;
  if (score >= 80) scoreColor = colors.good;
  else if (score >= 60) scoreColor = colors.warning;
  else scoreColor = colors.critical;

  console.log(`\n  ${chalk.bold('Health Score:')} ${scoreColor(`${score}/100`)}  ${bar}`);
}

function renderSection(title: string, findings: Finding[], severity: Severity): void {
  const color = severityColor(severity);
  const count = findings.length;
  const header = color(`── ${title} (${count}) ${'─'.repeat(Math.max(0, 40 - title.length))}`);

  console.log(`\n  ${header}\n`);

  for (const finding of findings) {
    renderFinding(finding);
  }
}

function renderFinding(finding: Finding): void {
  const icon = severityIcon(finding.severity);
  const title = chalk.bold(finding.title);
  const location = finding.line
    ? `${colors.file(finding.file)}:${colors.line(String(finding.line))}`
    : colors.file(finding.file);

  console.log(`  ${icon} ${title}`);
  console.log(`    ${location}`);

  if (finding.description) {
    console.log(`\n    ${colors.dim(finding.description)}`);
  }

  if (finding.codeSnippet) {
    console.log(`\n    ${colors.critical(finding.codeSnippet)}`);
  }

  if (finding.fix) {
    console.log(`\n    ${chalk.bold('Fix:')} ${colors.good(finding.fix)}`);
  }

  if (finding.source) {
    console.log(`\n    ${colors.dim(`Source: ${finding.source}`)}`);
  }

  console.log();
}

function renderGoodPatterns(findings: Finding[]): void {
  const header = colors.good(`── GOOD PATTERNS (${findings.length}) ${'─'.repeat(24)}`);
  console.log(`\n  ${header}\n`);

  for (const finding of findings) {
    console.log(`  ${icons.good} ${finding.title}`);
    if (finding.description) {
      console.log(`    ${colors.dim(finding.description)}`);
    }
  }
  console.log();
}

function renderSummaryTable(report: AnalysisReport): void {
  const header = colors.dim(`── Summary ${'─'.repeat(35)}`);
  console.log(`\n  ${header}\n`);

  const table = new Table({
    style: {
      head: [],
      border: ['gray'],
      compact: true,
    },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│',
    },
  });

  table.push(
    [colors.critical('Critical'), chalk.bold(String(report.summary.critical))],
    [colors.warning('Warning'), chalk.bold(String(report.summary.warning))],
    [colors.suggestion('Suggest'), chalk.bold(String(report.summary.suggestion))],
    [colors.good('Good'), chalk.bold(String(report.summary.good))],
  );

  const lines = table.toString().split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log();
}

function groupBySeverity(findings: Finding[]) {
  return {
    critical: findings.filter((f) => f.severity === 'critical'),
    warning: findings.filter((f) => f.severity === 'warning'),
    suggestion: findings.filter((f) => f.severity === 'suggestion'),
    good: findings.filter((f) => f.severity === 'good'),
  };
}
