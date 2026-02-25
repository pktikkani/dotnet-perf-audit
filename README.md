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

## Shell Integration (fzf)

Add these to your `.zshrc` for interactive project selection:

### Commands

| Command | What it does |
|---------|-------------|
| `dotnetaudit` | fzf picks a .NET project from your dirs, runs audit |
| `dotnetaudit /path/to/project` | Audit a specific .NET project |
| `dotnetaudit /path -f html` | Pass any extra flags through |
| `cppaudit` | fzf picks a C++ project from your dirs, runs audit |
| `cppaudit /path/to/project` | Audit a specific C++ project |

### Quick Aliases

| Alias | Expands to |
|-------|-----------|
| `dotnetaudit-html` | fzf pick + HTML report |
| `dotnetaudit-ci` | fzf pick + CI mode |
| `dotnetaudit-md` | fzf pick + Markdown output |
| `cppaudit-html` | fzf pick + HTML report |
| `cppaudit-ci` | fzf pick + CI mode |
| `cppaudit-md` | fzf pick + Markdown output |

### Setup

Requires `fzf` and `fd` installed (`brew install fzf fd`). Add to `~/.zshrc`:

```bash
# .NET Performance Audit (fzf project picker)
dotnetaudit() {
  local target="$1"
  shift 2>/dev/null
  local extra_args=("$@")
  if [[ -z "$target" ]]; then
    target=$(fd -t f '\.(csproj|sln)$' \
      ~/Documents ~/Projects ~/code ~/repos ~/src ~/dev ~/Work 2>/dev/null \
      | sed 's|/[^/]*$||' | sort -u \
      | fzf --prompt="⚡ Select .NET project to audit: " \
            --preview 'ls -la {} 2>/dev/null | head -20' \
            --preview-window=right:40%)
    [[ -z "$target" ]] && echo "No project selected." && return 1
  fi
  echo "⚡ Running dotnet-perf-audit on: $target"
  dotnet-perf-audit "$target" "${extra_args[@]}"
}

alias dotnetaudit-html='dotnetaudit "" -f html'
alias dotnetaudit-ci='dotnetaudit "" --ci'
alias dotnetaudit-md='dotnetaudit "" -f markdown'
```

## What It Detects

| Category | Examples |
|----------|----------|
| **Async/Await** | Sync-over-async (.Result, .Wait()), async void, missing CancellationToken |
| **Memory** | String concat in loops, unnecessary LINQ allocations, boxing, missing Span\<T\> |
| **EF Core** | Missing AsNoTracking, N+1 queries, missing DbContext pooling, IQueryable leakage |
| **ASP.NET Core** | Direct HttpClient creation, missing response compression, missing rate limiting |
| **Middleware** | Ordering issues, synchronous I/O, missing CORS, heavy computation in pipeline |
| **Architecture** | Service lifetime mismatches, missing IOptions pattern, missing health checks |

Sources: [David Fowler's Async Guidance](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios), [Stephen Toub's .NET Performance](https://devblogs.microsoft.com/dotnet/author/toaborstephen/), [Microsoft ASP.NET Core Docs](https://learn.microsoft.com/en-us/aspnet/core/performance/overview)

## Health Score

Each project gets a score from 0-100:
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

## License

MIT
