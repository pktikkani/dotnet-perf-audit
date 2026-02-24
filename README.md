# dotnet-perf-audit

A beautiful .NET performance analysis CLI powered by Claude AI.

Point it at any .NET repository and get actionable performance findings — sync-over-async, missing AsNoTracking, allocation hotspots, and more.

## Quick Start

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run against a .NET project
npx dotnet-perf-audit ./path/to/dotnet-project
```

## Usage

```
Usage: dotnet-perf-audit [path] [options]

Arguments:
  path                    Path to .NET project/solution (default: ".")

Options:
  -f, --format <format>   Output format: terminal, markdown, html, json (default: "terminal")
  -o, --output <file>     Output file path (for markdown/html/json)
  --severity <level>      Minimum severity: critical, warning, suggestion (default: "suggestion")
  --no-stream             Disable streaming output
  --ci                    CI mode: exit code 1 if critical findings, minimal output
  -V, --version           Show version
  -h, --help              Show help
```

## Examples

```bash
# Terminal output with beautiful formatting
dotnet-perf-audit ./MyApi

# Generate HTML report
dotnet-perf-audit ./MyApi -f html -o report.html

# Markdown for PR comments
dotnet-perf-audit ./MyApi -f markdown -o findings.md

# CI pipeline (exits 1 if critical issues found)
dotnet-perf-audit ./MyApi --ci --severity critical

# JSON for programmatic consumption
dotnet-perf-audit ./MyApi -f json -o results.json
```

## What It Detects

| Category | Examples |
|----------|----------|
| **Async/Await** | Sync-over-async (.Result, .Wait()), async void, missing CancellationToken |
| **Memory** | String concat in loops, unnecessary LINQ allocations, boxing |
| **EF Core** | Missing AsNoTracking, N+1 queries, missing DbContext pooling |
| **ASP.NET Core** | Direct HttpClient creation, missing response compression |
| **Middleware** | Ordering issues, synchronous I/O, missing CORS |
| **Architecture** | Service lifetime mismatches, missing IOptions pattern |

## Health Score

Each project gets a score from 0–100:
- **Critical** findings: -15 points each
- **Warning** findings: -5 points each
- **Suggestion** findings: -1 point each
- **Good patterns** are recognized and highlighted

## Requirements

- Node.js 20+
- Anthropic API key (`ANTHROPIC_API_KEY` environment variable)

## Development

```bash
npm install
npm run build
node dist/cli.js ./test-project
```
