import type { FileCategory } from '../types/index.js';

interface CategoryPattern {
  category: FileCategory;
  patterns: RegExp[];
  pathPatterns?: RegExp[];
}

const categoryRules: CategoryPattern[] = [
  {
    category: 'controller',
    patterns: [
      /:\s*Controller(Base)?\b/,
      /\[ApiController\]/,
      /\[HttpGet/,
      /\[HttpPost/,
      /\[HttpPut/,
      /\[HttpDelete/,
      /\[HttpPatch/,
      /\[Route\(/,
    ],
    pathPatterns: [/Controllers?\//i],
  },
  {
    category: 'dbcontext',
    patterns: [
      /:\s*DbContext\b/,
      /:\s*IdentityDbContext/,
      /DbSet\s*</,
      /OnModelCreating/,
    ],
  },
  {
    category: 'middleware',
    patterns: [
      /IMiddleware/,
      /RequestDelegate/,
      /InvokeAsync\s*\(\s*HttpContext/,
      /Invoke\s*\(\s*HttpContext/,
    ],
    pathPatterns: [/Middlewar(e|es)\//i],
  },
  {
    category: 'startup',
    patterns: [
      /WebApplication\.CreateBuilder/,
      /IServiceCollection/,
      /AddControllers\(\)/,
      /AddDbContext/,
      /app\.Use/,
      /builder\.Services/,
    ],
    pathPatterns: [/Program\.cs$/i, /Startup\.cs$/i],
  },
  {
    category: 'repository',
    patterns: [
      /IRepository/,
      /RepositoryBase/,
      /IUnitOfWork/,
    ],
    pathPatterns: [/Repositor(y|ies)\//i, /Data\//i],
  },
  {
    category: 'service',
    patterns: [
      /IService/,
      /ServiceBase/,
    ],
    pathPatterns: [/Services?\//i, /Application\//i, /Handlers?\//i],
  },
  {
    category: 'model',
    patterns: [],
    pathPatterns: [/Models?\//i, /Entit(y|ies)\//i, /Dtos?\//i, /ViewModels?\//i],
  },
];

export function categorizeFile(filePath: string, content: string): FileCategory {
  for (const rule of categoryRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(content)) {
        return rule.category;
      }
    }
  }

  for (const rule of categoryRules) {
    if (rule.pathPatterns) {
      for (const pattern of rule.pathPatterns) {
        if (pattern.test(filePath)) {
          return rule.category;
        }
      }
    }
  }

  return 'other';
}

const categoryPriority: Record<FileCategory, number> = {
  controller: 0,
  dbcontext: 1,
  service: 2,
  middleware: 3,
  startup: 4,
  repository: 5,
  model: 6,
  other: 7,
};

export function sortByPriority(a: FileCategory, b: FileCategory): number {
  return categoryPriority[a] - categoryPriority[b];
}
