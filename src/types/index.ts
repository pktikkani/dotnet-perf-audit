export interface PackageRef {
  name: string;
  version: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  dotnetVersion: string;
  framework: string;
  projectFiles: string[];
  packages: PackageRef[];
}

export type FileCategory =
  | 'controller'
  | 'service'
  | 'repository'
  | 'dbcontext'
  | 'middleware'
  | 'startup'
  | 'model'
  | 'other';

export interface AnalysisFile {
  path: string;
  relativePath: string;
  category: FileCategory;
  content: string;
  lineCount: number;
}

export type Severity = 'critical' | 'warning' | 'suggestion' | 'good';

export interface Finding {
  severity: Severity;
  category: string;
  title: string;
  file: string;
  line?: number;
  description: string;
  codeSnippet?: string;
  fix?: string;
  source?: string;
}

export interface AnalysisSummary {
  critical: number;
  warning: number;
  suggestion: number;
  good: number;
  filesAnalyzed: number;
  score: number;
}

export interface AnalysisReport {
  project: ProjectInfo;
  files: AnalysisFile[];
  findings: Finding[];
  summary: AnalysisSummary;
  timestamp: string;
  duration: number;
}

export interface CliOptions {
  format: 'terminal' | 'markdown' | 'html' | 'json';
  output?: string;
  severity: 'critical' | 'warning' | 'suggestion';
  stream: boolean;
  ci: boolean;
}
