import type { AnalysisFile, AnalysisReport, Finding, ProjectInfo } from '../types/index.js';
import { analyzeCode, analyzeCodeStreaming } from './claude-client.js';
import { buildAnalysisPrompt } from './prompts.js';

const MAX_TOKENS_PER_BATCH = 30_000;
const CHARS_PER_TOKEN_ESTIMATE = 4;
const MAX_CHARS_PER_BATCH = MAX_TOKENS_PER_BATCH * CHARS_PER_TOKEN_ESTIMATE;

export async function analyze(
  project: ProjectInfo,
  files: AnalysisFile[],
  options: { stream: boolean; onToken?: (token: string) => void; onBatchStart?: (batch: number, total: number) => void },
): Promise<AnalysisReport> {
  const startTime = Date.now();
  const batches = createBatches(files);
  const allFindings: Finding[] = [];
  const packageNames = project.packages.map((p) => p.name);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    options.onBatchStart?.(i + 1, batches.length);

    const prompt = buildAnalysisPrompt(
      batch.map((f) => ({
        relativePath: f.relativePath,
        content: f.content,
        category: f.category,
      })),
      project.framework,
      packageNames,
    );

    let findings: Finding[];
    if (options.stream && options.onToken) {
      findings = await analyzeCodeStreaming(prompt, options.onToken);
    } else {
      findings = await analyzeCode(prompt);
    }

    allFindings.push(...findings);
  }

  const duration = (Date.now() - startTime) / 1000;
  const summary = computeSummary(allFindings, files.length);

  return {
    project,
    files,
    findings: allFindings,
    summary,
    timestamp: new Date().toISOString(),
    duration,
  };
}

function createBatches(files: AnalysisFile[]): AnalysisFile[][] {
  const batches: AnalysisFile[][] = [];
  let currentBatch: AnalysisFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    const fileSize = file.content.length;

    if (currentSize + fileSize > MAX_CHARS_PER_BATCH && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push(file);
    currentSize += fileSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

function computeSummary(findings: Finding[], filesAnalyzed: number) {
  const counts = { critical: 0, warning: 0, suggestion: 0, good: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }

  let score = 100;
  score -= counts.critical * 15;
  score -= counts.warning * 5;
  score -= counts.suggestion * 1;
  score = Math.max(0, Math.min(100, score));

  return {
    ...counts,
    filesAnalyzed,
    score,
  };
}
