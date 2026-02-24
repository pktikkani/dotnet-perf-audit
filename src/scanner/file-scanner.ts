import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import type { AnalysisFile } from '../types/index.js';
import { categorizeFile, sortByPriority } from './file-categorizer.js';

const MAX_FILE_SIZE = 50_000;
const MAX_FILES = 100;

export async function scanFiles(rootPath: string): Promise<AnalysisFile[]> {
  const csFiles = await fg('**/*.cs', {
    cwd: rootPath,
    absolute: true,
    ignore: [
      '**/bin/**',
      '**/obj/**',
      '**/Migrations/**',
      '**/node_modules/**',
      '**/*.Designer.cs',
      '**/*.g.cs',
      '**/*.AssemblyInfo.cs',
    ],
  });

  const files: AnalysisFile[] = [];

  for (const filePath of csFiles) {
    const content = await readFile(filePath, 'utf-8');

    if (content.length > MAX_FILE_SIZE) continue;

    const relativePath = relative(rootPath, filePath);
    const category = categorizeFile(relativePath, content);
    const lineCount = content.split('\n').length;

    files.push({
      path: filePath,
      relativePath,
      category,
      content,
      lineCount,
    });
  }

  files.sort((a, b) => sortByPriority(a.category, b.category));

  return files.slice(0, MAX_FILES);
}
