# OpenAI MCP Server Setup Script for Windows
# Usage: .\setup.ps1 -ApiKey "YOUR_OPENAI_API_KEY"
# Installs with 'user' scope (available in all your projects)

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Stop"

Write-Host "OpenAI MCP Server Setup" -ForegroundColor Blue
Write-Host ""

# Check Node.js version
Write-Host "Checking requirements..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v 2>&1
    if ($nodeVersion -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -lt 18) {
            Write-Host "Node.js 18+ is required. Found: $nodeVersion" -ForegroundColor Red
            exit 1
        }
        Write-Host "Node.js $nodeVersion found" -ForegroundColor Green
    }
} catch {
    Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Download it at: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    npm --version | Out-Null
    Write-Host "npm found" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Claude Code CLI
try {
    claude --version 2>&1 | Out-Null
    Write-Host "Claude Code CLI found" -ForegroundColor Green
} catch {
    Write-Host "Claude Code CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
    exit 1
}

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptDir "dist" "index.js"

# Install dependencies and build
Write-Host ""
Write-Host "Installing dependencies and building..." -ForegroundColor Yellow
Push-Location $scriptDir
npm install --quiet

# Verify build output exists
if (-not (Test-Path $serverPath)) {
    Write-Host "Building server..." -ForegroundColor Yellow
    npm run build
}

Pop-Location

if (-not (Test-Path $serverPath)) {
    Write-Host "Build failed - dist/index.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "Server built successfully" -ForegroundColor Green

# Remove any existing MCP configuration
Write-Host ""
Write-Host "Configuring Claude Code..." -ForegroundColor Yellow
try {
    claude mcp remove OpenAI 2>$null
} catch {
    # Ignore if not exists
}

# Add MCP server with user scope and API key as environment variable
claude mcp add -s user OpenAI -e "OPENAI_API_KEY=$ApiKey" -- node $serverPath

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use OpenAI in Claude Code from any directory!" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Restart Claude Code for changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "Available tools:" -ForegroundColor White
Write-Host "  - ask                    - General questions" -ForegroundColor Gray
Write-Host "  - code_review            - Code analysis" -ForegroundColor Gray
Write-Host "  - brainstorm             - Creative ideation" -ForegroundColor Gray
Write-Host "  - explain                - Concept explanations" -ForegroundColor Gray
Write-Host "  - search_web             - Web search with citations" -ForegroundColor Gray
Write-Host "  - search_with_reasoning  - Extended reasoning" -ForegroundColor Gray
Write-Host "  - run_code               - Python code execution" -ForegroundColor Gray
Write-Host "  - fetch_url              - Web page analysis" -ForegroundColor Gray
Write-Host "  - upload_file            - File analysis" -ForegroundColor Gray
Write-Host "  - generate_image         - Image generation" -ForegroundColor Gray
Write-Host "  - edit_image             - Image editing" -ForegroundColor Gray
Write-Host "  - analyze_image          - Image analysis (vision)" -ForegroundColor Gray
Write-Host "  - text_to_speech         - Text to speech" -ForegroundColor Gray
Write-Host "  - transcribe             - Speech to text" -ForegroundColor Gray
