import chalk from 'chalk';

export const colors = {
  critical: chalk.red,
  criticalBg: chalk.bgRed.white.bold,
  warning: chalk.yellow,
  warningBg: chalk.bgYellow.black.bold,
  suggestion: chalk.blue,
  suggestionBg: chalk.bgBlue.white.bold,
  good: chalk.green,
  goodBg: chalk.bgGreen.black.bold,
  accent: chalk.magenta,
  dim: chalk.dim,
  bold: chalk.bold,
  muted: chalk.gray,
  file: chalk.cyan,
  line: chalk.yellow,
  code: chalk.white,
  header: chalk.bold.white,
};

export const icons = {
  critical: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  suggestion: chalk.blue('ℹ'),
  good: chalk.green('✔'),
  bolt: '⚡',
  arrow: chalk.dim('→'),
  dot: chalk.dim('·'),
  bar: {
    filled: '█',
    empty: '░',
  },
};

export function severityColor(severity: string): chalk.ChalkInstance {
  switch (severity) {
    case 'critical': return colors.critical;
    case 'warning': return colors.warning;
    case 'suggestion': return colors.suggestion;
    case 'good': return colors.good;
    default: return colors.dim;
  }
}

export function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return icons.critical;
    case 'warning': return icons.warning;
    case 'suggestion': return icons.suggestion;
    case 'good': return icons.good;
    default: return icons.dot;
  }
}

export function progressBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  let color: chalk.ChalkInstance;
  if (score >= 80) color = colors.good;
  else if (score >= 60) color = colors.warning;
  else color = colors.critical;

  return color(icons.bar.filled.repeat(filled)) + colors.dim(icons.bar.empty.repeat(empty));
}
