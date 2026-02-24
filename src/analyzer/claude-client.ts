import Anthropic from '@anthropic-ai/sdk';
import type { Finding } from '../types/index.js';
import { SYSTEM_PROMPT } from './prompts.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;
const MAX_RETRIES = 3;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required.\n' +
        'Set it with: export ANTHROPIC_API_KEY=your-key-here',
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function analyzeCode(prompt: string): Promise<Finding[]> {
  const anthropic = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return [];
      }

      return parseFindings(textBlock.text);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errObj = err as { status?: number };

      if (errObj.status === 429 || errObj.status === 529) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('Analysis failed after retries');
}

export async function analyzeCodeStreaming(
  prompt: string,
  onToken: (token: string) => void,
): Promise<Finding[]> {
  const anthropic = getClient();

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const delta = event.delta;
      if ('text' in delta) {
        fullText += delta.text;
        onToken(delta.text);
      }
    }
  }

  return parseFindings(fullText);
}

function parseFindings(text: string): Finding[] {
  let cleaned = text.trim();

  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((f: Record<string, unknown>) => ({
      severity: validateSeverity(f.severity),
      category: String(f.category ?? 'other'),
      title: String(f.title ?? 'Untitled finding'),
      file: String(f.file ?? ''),
      line: typeof f.line === 'number' ? f.line : undefined,
      description: String(f.description ?? ''),
      codeSnippet: f.codeSnippet ? String(f.codeSnippet) : undefined,
      fix: f.fix ? String(f.fix) : undefined,
      source: f.source ? String(f.source) : undefined,
    }));
  } catch {
    return [];
  }
}

function validateSeverity(value: unknown): Finding['severity'] {
  const valid = ['critical', 'warning', 'suggestion', 'good'];
  const str = String(value);
  return valid.includes(str) ? (str as Finding['severity']) : 'suggestion';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
