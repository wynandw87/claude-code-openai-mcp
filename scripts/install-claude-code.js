#!/usr/bin/env node

/**
 * Helper script to install OpenAI MCP Server in Claude Code
 * This automates the configuration process
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Installing OpenAI MCP Server for Claude Code\n');

// Check if Claude Code CLI is available
try {
  execSync('claude --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Error: Claude Code CLI not found');
  console.error('   Please install Claude Code first: https://claude.ai/claude-code\n');
  process.exit(1);
}

// Determine the path to the server
const distPath = join(__dirname, '..', 'dist', 'index.js');
const absolutePath = resolve(distPath);

if (!existsSync(absolutePath)) {
  console.error('❌ Error: Server build files not found');
  console.error('   Please run: npm run build\n');
  process.exit(1);
}

console.log('📍 Server location:', absolutePath.replace(/\\/g, '/'), '\n');

// Check if server is already installed
let isInstalled = false;
try {
  const output = execSync('claude mcp list', { encoding: 'utf-8' });
  if (output.includes('OpenAI')) {
    isInstalled = true;
    console.log('⚠️  OpenAI MCP server is already installed in Claude Code');
    console.log('   To reinstall, first run: claude mcp remove OpenAI\n');
  }
} catch (error) {
  // MCP list command failed, proceed with installation
}

if (!isInstalled) {
  try {
    console.log('📦 Adding server to Claude Code...');

    let command;
    if (process.env.OPENAI_API_KEY) {
      console.log('🔑 Using API key from environment...');
      command = `claude mcp add -s user OpenAI -e OPENAI_API_KEY="${process.env.OPENAI_API_KEY}" -- node "${absolutePath.replace(/\\/g, '/')}"`;
    } else {
      command = `claude mcp add -s user OpenAI -- node "${absolutePath.replace(/\\/g, '/')}"`;
    }

    execSync(command, { stdio: 'inherit' });
    console.log('✅ Server added successfully!\n');

    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  OPENAI_API_KEY not found in environment');
      console.log('   To add your API key, remove and re-add the server:\n');
      console.log('   claude mcp remove OpenAI');
      console.log(`   claude mcp add -s user OpenAI -e OPENAI_API_KEY="YOUR_API_KEY" -- node "${absolutePath.replace(/\\/g, '/')}"\n`);
      console.log('📖 Get your API key from: https://platform.openai.com/api-keys\n');
    }

    console.log('🎉 Installation complete!');
    console.log('   Restart Claude Code to use the OpenAI MCP server\n');
  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    console.error('\nManual installation:');
    console.error(`   claude mcp add -s user OpenAI -- node "${absolutePath.replace(/\\/g, '/')}"`);
    console.error('\nThen add your API key by editing ~/.claude.json\n');
    process.exit(1);
  }
}
