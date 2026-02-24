import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { PackageRef, ProjectInfo } from '../types/index.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export async function scanProjects(rootPath: string): Promise<ProjectInfo[]> {
  const csprojFiles = await fg('**/*.csproj', {
    cwd: rootPath,
    absolute: true,
    ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**'],
  });

  if (csprojFiles.length === 0) {
    throw new Error(`No .csproj files found in ${rootPath}`);
  }

  const projects: ProjectInfo[] = [];

  for (const csprojPath of csprojFiles) {
    const project = await parseProjectFile(csprojPath, rootPath);
    if (project) {
      projects.push(project);
    }
  }

  return projects;
}

async function parseProjectFile(csprojPath: string, rootPath: string): Promise<ProjectInfo | null> {
  const xml = await readFile(csprojPath, 'utf-8');

  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }

  const project = parsed?.Project as Record<string, unknown> | undefined;
  if (!project) return null;

  const propertyGroups = normalizeToArray(project.PropertyGroup);
  const itemGroups = normalizeToArray(project.ItemGroup);

  let framework = '';
  for (const pg of propertyGroups) {
    const group = pg as Record<string, unknown>;
    if (group.TargetFramework) {
      framework = String(group.TargetFramework);
      break;
    }
    if (group.TargetFrameworks) {
      framework = String(group.TargetFrameworks).split(';')[0];
      break;
    }
  }

  const packages: PackageRef[] = [];
  for (const ig of itemGroups) {
    const group = ig as Record<string, unknown>;
    const refs = normalizeToArray(group.PackageReference);
    for (const ref of refs) {
      const r = ref as Record<string, unknown>;
      const name = r['@_Include'] ?? r['@_include'];
      const version = r['@_Version'] ?? r['@_version'] ?? '';
      if (name) {
        packages.push({ name: String(name), version: String(version) });
      }
    }
  }

  const dotnetVersion = extractDotnetVersion(framework);

  return {
    name: basename(csprojPath, '.csproj'),
    path: csprojPath,
    dotnetVersion,
    framework,
    projectFiles: [csprojPath],
    packages,
  };
}

function extractDotnetVersion(framework: string): string {
  const match = framework.match(/net(\d+\.\d+)/);
  if (match) return match[1];
  if (framework.startsWith('net') && !framework.includes('.')) {
    const ver = framework.replace('net', '');
    return `${ver}.0`;
  }
  return framework || 'unknown';
}

function normalizeToArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
