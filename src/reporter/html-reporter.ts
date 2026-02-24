import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnalysisReport } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generateHtmlReport(report: AnalysisReport): Promise<string> {
  // When bundled, the template gets resolved relative to dist/
  // Try multiple paths for flexibility
  let templateContent: string;
  const paths = [
    resolve(__dirname, '..', 'templates', 'report.hbs'),
    resolve(__dirname, '..', '..', 'templates', 'report.hbs'),
    resolve(process.cwd(), 'templates', 'report.hbs'),
  ];

  for (const p of paths) {
    try {
      templateContent = await readFile(p, 'utf-8');
      break;
    } catch {
      // try next path
    }
  }

  // Fallback: inline a minimal template
  templateContent ??= getFallbackTemplate();

  const template = Handlebars.compile(templateContent);

  const scoreColor = report.summary.score >= 80
    ? '#22c55e'
    : report.summary.score >= 60
      ? '#eab308'
      : '#ef4444';

  const circumference = 2 * Math.PI * 50;
  const scoreOffset = circumference - (report.summary.score / 100) * circumference;

  const data = {
    ...report,
    duration: report.duration.toFixed(1),
    scoreColor,
    scoreOffset: scoreOffset.toFixed(2),
    totalFindings: report.findings.length,
  };

  return template(data);
}

function getFallbackTemplate(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>dotnet-perf-audit Report</title>
<style>body{font-family:system-ui;background:#0f0f13;color:#e4e4ef;max-width:800px;margin:0 auto;padding:2rem}
h1{color:#a855f7}pre{background:#1a1a24;padding:1rem;border-radius:8px;overflow-x:auto}
.critical{color:#ef4444}.warning{color:#eab308}.suggestion{color:#3b82f6}.good{color:#22c55e}
.finding{background:#1a1a24;border:1px solid #2d2d44;border-radius:8px;padding:1rem;margin:0.5rem 0}</style></head>
<body><h1>⚡ dotnet-perf-audit</h1>
<p>Project: {{project.name}} | .NET {{project.dotnetVersion}} | Score: {{summary.score}}/100</p>
{{#each findings}}<div class="finding"><strong class="{{severity}}">{{severity}}</strong> — <strong>{{title}}</strong>
<br><small>{{file}}{{#if line}}:{{line}}{{/if}}</small>
<p>{{description}}</p>
{{#if codeSnippet}}<pre>{{codeSnippet}}</pre>{{/if}}
{{#if fix}}<p><strong>Fix:</strong></p><pre>{{fix}}</pre>{{/if}}
</div>{{/each}}
<hr><small>Generated at {{timestamp}}</small></body></html>`;
}
