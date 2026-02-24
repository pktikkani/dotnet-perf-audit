import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';

const VERSION = '1.0.0';

const purpleBlue = gradient(['#a855f7', '#6366f1', '#3b82f6']);

export function showBanner(): void {
  const title = purpleBlue('⚡ dotnet-perf-audit');
  const subtitle = chalk.dim('.NET Performance Analysis Tool');
  const version = chalk.dim(`v${VERSION}`);

  const banner = boxen(
    `${title}  ${version}\n${subtitle}`,
    {
      padding: { top: 1, bottom: 1, left: 3, right: 3 },
      borderStyle: 'double',
      borderColor: 'magenta',
      dimBorder: true,
    }
  );

  console.log();
  console.log(banner);
  console.log();
}

export function showCompletionBanner(score: number): void {
  let emoji: string;
  let message: string;

  if (score >= 90) {
    emoji = '🏆';
    message = 'Excellent! Your code follows .NET performance best practices.';
  } else if (score >= 75) {
    emoji = '👍';
    message = 'Good shape! A few optimizations could improve performance.';
  } else if (score >= 50) {
    emoji = '⚠️';
    message = 'Some performance issues detected. Review the findings below.';
  } else {
    emoji = '🔴';
    message = 'Significant performance issues found. Prioritize critical fixes.';
  }

  console.log(`\n  ${emoji} ${chalk.bold(message)}\n`);
}

export { VERSION };
