# OpenAI MCP Server

MCP server that brings OpenAI to Claude Code — text generation, brainstorming, code review, explanations, web search, reasoning, code execution, URL fetching, image generation/editing/analysis, text-to-speech, and transcription. Supports GPT-5.2, GPT-5.2-Codex, o4-mini, gpt-image-1.5, and Whisper models.

## Quick Start

### Step 1: Get Your API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate an API key
4. Copy the key (you'll need it in Step 3)

### Step 2: Install Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Claude Code CLI** - [Installation guide](https://docs.anthropic.com/claude-code)

### Step 3: Install the MCP Server

#### 3.1 Clone the repository

```text
git clone https://github.com/wynandw87/claude-code-openai-mcp.git
cd claude-code-openai-mcp
```

#### 3.2 Install dependencies

**macOS / Linux / Windows:**
```text
npm install
```

> **Note:** Dependencies are installed and the server is built automatically in one step.

#### 3.3 Register with Claude Code

Choose your install scope:

| Scope | Flag | Who can use it |
|-------|------|----------------|
| **User** (recommended) | `-s user` | You, in any project |
| **Project** | `-s project` | Anyone who clones this repo |
| **Local** | `-s local` | Only in current directory |

Replace `YOUR_API_KEY` with your actual OpenAI API key, and use the full path to `dist/index.js`.

> **Tip:** To get the full path, run this from the cloned directory:
> - macOS/Linux: `echo "$(pwd)/dist/index.js"`
> - Windows: `echo %cd%\dist\index.js`

**macOS / Linux:**
```text
claude mcp add -s user OpenAI -e OPENAI_API_KEY=YOUR_API_KEY -- node /full/path/to/dist/index.js
```

**Windows (CMD):**
```text
claude mcp add -s user OpenAI -e "OPENAI_API_KEY=YOUR_API_KEY" -- node "C:\full\path\to\dist\index.js"
```

**Windows (PowerShell):**
```text
claude mcp add -s user OpenAI -e "OPENAI_API_KEY=YOUR_API_KEY" '--' node "C:\full\path\to\dist\index.js"
```

#### Alternative: Use Setup Scripts

The setup scripts handle dependency installation, building, and registration automatically.

**macOS / Linux:**
```text
chmod +x setup.sh
./setup.sh YOUR_API_KEY
```

**Windows (PowerShell):**
```text
.\setup.ps1 -ApiKey YOUR_API_KEY
```

**Or use the npm helper (if API key is set in environment):**
```text
export OPENAI_API_KEY=YOUR_API_KEY
npm run install:claude
```

### Step 4: Restart Claude Code

Close and reopen Claude Code for the changes to take effect.

### Step 5: Verify Installation

```text
claude mcp list
```

You should see `OpenAI` listed with a Connected status.

---

## Features

### Text & Reasoning
- **General Queries** (`ask`) - Flexible interface to query any supported OpenAI model
- **Brainstorming** (`brainstorm`) - Creative ideation
- **Code Review** (`code_review`) - Thorough code analysis
- **Explanations** (`explain`) - Clear concept explanations using GPT-5-mini
- **Reasoning** (`search_with_reasoning`) - Extended reasoning with o4-mini/o3 models

### Search & Web
- **Web Search** (`search_web`) - Real-time web search with citations
- **URL Fetching** (`fetch_url`) - Fetch and analyze web pages

### Code & Files
- **Code Execution** (`run_code`) - Server-side Python execution with NumPy, Pandas, Matplotlib, SciPy
- **File Upload** (`upload_file`) - Upload documents for analysis (any text-based file; PDF, CSV, code, etc.)

### Images
- **Image Generation** (`generate_image`) - Text-to-image using gpt-image-1.5
- **Image Editing** (`edit_image`) - Edit existing images with natural language and optional mask
- **Image Analysis** (`analyze_image`) - Vision model to describe and analyze images

### Audio
- **Text-to-Speech** (`text_to_speech`) - Convert text to speech with 10 voice options
- **Transcription** (`transcribe`) - Speech-to-text using Whisper

---

## Usage

Once installed, use trigger phrases to invoke OpenAI:

| Trigger | Tool | Example |
|---------|------|---------|
| `use openai`, `ask openai` | Ask | "ask openai about quantum computing" |
| `openai review`, `have openai review` | Code Review | "openai review this function for security" |
| `openai brainstorm`, `openai ideas` | Brainstorm | "openai brainstorm ideas for authentication" |
| `openai explain` | Explain | "openai explain how WebSockets work" |
| `openai search`, `openai web search` | Web Search | "openai search: latest React 19 features" |
| `openai reason`, `openai think` | Reasoning | "openai think: prove sqrt(2) is irrational" |
| `openai run code`, `openai calculate` | Run Code | "openai calculate the first 50 prime numbers" |
| `openai fetch url` | Fetch URL | "openai fetch and summarize https://example.com" |
| `openai upload file` | Upload File | "openai upload ./report.pdf and summarize it" |
| `openai generate image`, `openai image` | Generate Image | "openai generate image of a sunset" |
| `openai edit image` | Edit Image | "openai edit image: make the sky more blue" |
| `openai analyze image`, `openai vision` | Analyze Image | "openai analyze image at ./screenshot.png" |
| `openai tts`, `openai speak` | Text-to-Speech | "openai speak: Hello, welcome to the demo" |
| `openai transcribe` | Transcribe | "openai transcribe ./meeting.mp3" |

Or ask naturally:

- *"Ask OpenAI what it thinks about this approach"*
- *"Have OpenAI review this code for security issues"*
- *"Brainstorm with OpenAI about scaling strategies"*
- *"OpenAI search the web for the latest news on AI"*
- *"OpenAI run code to calculate compound interest over 10 years"*
- *"Upload this CSV to OpenAI and ask it to summarize the data"*
- *"OpenAI generate an image of a futuristic city"*
- *"OpenAI describe what's in this screenshot"*
- *"OpenAI convert this text to speech using the nova voice"*
- *"OpenAI transcribe this audio recording"*

---

## Tool Reference

### ask

Query any OpenAI model with a custom prompt.

**Parameters:**
- `prompt` (string, required) - The question or instruction
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)
- `file_ids` (string[], optional) - File IDs from previous uploads to include as context

### code_review

Get thorough code analysis.

**Parameters:**
- `code` (string, required) - The code to review
- `focus` (string, optional) - Specific focus area (e.g., "security", "performance")

### brainstorm

Get creative ideas and brainstorming assistance.

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about
- `context` (string, optional) - Additional context

### explain

Get clear explanations using GPT-5-mini.

**Parameters:**
- `concept` (string, required) - What to explain

### search_web

Search the web with real-time results and citations.

**Parameters:**
- `query` (string, required) - The search query or question
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)

### search_with_reasoning

Query with extended reasoning. Shows the model's thought process.

**Parameters:**
- `prompt` (string, required) - The question or problem
- `model` (string, optional) - Model identifier (defaults to `o4-mini`)
- `effort` (string, optional) - `"low"`, `"medium"`, `"high"` (default: `"high"`)

### run_code

Execute Python code in OpenAI's sandboxed environment.

**Parameters:**
- `prompt` (string, required) - Description of what to compute or analyze
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)

**Environment:** Python with NumPy, Pandas, Matplotlib, SciPy pre-installed.

### fetch_url

Fetch and analyze web page content.

**Parameters:**
- `prompt` (string, required) - Question or instruction about the URL content
- `urls` (string[], required) - URLs to fetch and analyze (max 20)
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)

### upload_file

Upload a document for analysis. Supports most text-based file formats.

Files with natively supported extensions (`.c`, `.css`, `.csv`, `.html`, `.java`, `.js`, `.json`, `.md`, `.pdf`, `.py`, `.sh`, `.txt`, `.xml`, `.yaml`, etc.) are uploaded via the OpenAI Files API. Other text-based files (`.ts`, `.tsx`, `.go`, `.rs`, `.swift`, `.kt`, `.sql`, `.toml`, etc.) are read and passed inline as text — no format restrictions for code files.

**Parameters:**
- `file_path` (string, required) - Absolute path to the file to upload
- `query` (string, optional) - Question to ask about the file immediately after upload
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)

### generate_image

Generate images using gpt-image-1.5. Returns the image inline and saves to disk.

**Parameters:**
- `prompt` (string, required) - Image generation prompt
- `size` (string, optional) - `"auto"`, `"1024x1024"`, `"1536x1024"`, `"1024x1536"`
- `quality` (string, optional) - `"auto"`, `"low"`, `"medium"`, `"high"`
- `n` (integer, optional) - Number of images (1-10, default: 1)
- `save_path` (string, optional) - File path to save the image

### edit_image

Edit an existing image using natural language instructions.

**Parameters:**
- `prompt` (string, required) - Edit instructions
- `image_path` (string, required) - Absolute path to the source image
- `mask_path` (string, optional) - Path to mask image (transparent areas = edit zones)
- `size` (string, optional) - `"auto"`, `"1024x1024"`, `"1536x1024"`, `"1024x1536"`
- `quality` (string, optional) - `"auto"`, `"low"`, `"medium"`, `"high"`
- `save_path` (string, optional) - File path to save the edited image

### analyze_image

Analyze an image using OpenAI's vision capabilities.

**Parameters:**
- `image_path` (string, required) - Absolute path to the image file
- `prompt` (string, optional) - Question about the image (default: "Describe this image in detail")
- `model` (string, optional) - Model identifier (defaults to `gpt-5.2`)

### text_to_speech

Convert text to speech audio.

**Parameters:**
- `text` (string, required) - The text to convert
- `voice` (string, optional) - `"alloy"`, `"ash"`, `"ballad"`, `"coral"`, `"echo"`, `"fable"`, `"onyx"`, `"nova"`, `"sage"`, `"shimmer"`
- `model` (string, optional) - `"gpt-4o-mini-tts"` (default), `"tts-1"`, `"tts-1-hd"`
- `speed` (number, optional) - 0.25 to 4.0 (default: 1.0)
- `format` (string, optional) - `"mp3"` (default), `"opus"`, `"aac"`, `"flac"`, `"wav"`, `"pcm"`
- `save_path` (string, optional) - File path to save the audio

### transcribe

Transcribe audio to text.

**Parameters:**
- `audio_path` (string, required) - Path to audio file (mp3, mp4, mpeg, mpga, m4a, wav, webm)
- `model` (string, optional) - `"whisper-1"` (default), `"gpt-4o-transcribe"`, `"gpt-4o-mini-transcribe"`
- `language` (string, optional) - ISO-639-1 language code (e.g., "en", "es", "fr")
- `prompt` (string, optional) - Context to guide transcription style

---

## Supported Models

### Text Models
| Model | Best For |
|-------|----------|
| `gpt-5.2` | Default — flagship, highest quality |
| `gpt-5-mini` | Cost-effective, good quality |
| `gpt-5-nano` | Fastest, lowest cost |
| `gpt-4.1` | High quality, fast |
| `gpt-4.1-mini` | Cost-effective legacy |
| `gpt-4.1-nano` | Fastest legacy |
| `gpt-4o` | Multimodal, fast |
| `gpt-4o-mini` | Compact multimodal |

### Coding Models
| Model | Best For |
|-------|----------|
| `gpt-5.3-codex` | Latest — API rollout pending |
| `gpt-5.2-codex` | Default for code review — best available |
| `gpt-5.1-codex` | Stable code generation |
| `gpt-5-codex` | First-gen GPT-5 coding |

### Reasoning Models
| Model | Best For |
|-------|----------|
| `o4-mini` | Default reasoning — fast, cost-effective |
| `o3` | Maximum reasoning quality |
| `o3-pro` | Premium reasoning |
| `o3-mini` | Compact reasoning |

### Image Models
| Model | Best For |
|-------|----------|
| `gpt-image-1.5` | Default — latest image generation and editing |
| `gpt-image-1` | Previous generation |

### Audio Models
| Model | Best For |
|-------|----------|
| `gpt-4o-mini-tts` | Default TTS — high quality with instructions |
| `tts-1` | Standard TTS |
| `tts-1-hd` | High-definition TTS |
| `whisper-1` | Default transcription |
| `gpt-4o-transcribe` | Enhanced transcription |
| `gpt-4o-mini-transcribe` | Compact transcription |

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_DEFAULT_MODEL` | No | `gpt-5.2` | Default model for text tools |
| `OPENAI_TIMEOUT` | No | `60000` | API timeout in ms |
| `OPENAI_OUTPUT_DIR` | No | `./generated-media` | Directory for auto-saved images and audio |

---

## How It Works

This MCP server uses the official `openai` npm package to communicate with OpenAI models. It connects to Claude Code via stdio transport.

**Tools provided:**
| Tool | API Feature | Default Model |
|------|-------------|---------------|
| `ask` | Responses API | Configurable (`gpt-5.2`) |
| `brainstorm` | Responses API | `gpt-5.2` |
| `code_review` | Responses API | `gpt-5.2-codex` |
| `explain` | Responses API | `gpt-5-mini` |
| `search_web` | Responses + web_search | Configurable (`gpt-5.2`) |
| `search_with_reasoning` | Responses + reasoning | `o4-mini` |
| `run_code` | Responses + code_interpreter | Configurable (`gpt-5.2`) |
| `fetch_url` | Responses + web_search | Configurable (`gpt-5.2`) |
| `upload_file` | Files API + Responses (inline fallback) | Configurable (`gpt-5.2`) |
| `generate_image` | Images API | `gpt-image-1.5` |
| `edit_image` | Images Edit API | `gpt-image-1.5` |
| `analyze_image` | Responses (vision) | Configurable (`gpt-5.2`) |
| `text_to_speech` | Audio Speech API | `gpt-4o-mini-tts` |
| `transcribe` | Audio Transcriptions | `whisper-1` |

---

## Troubleshooting

### Fix API Key

If you entered the wrong API key, remove and reinstall:

```text
claude mcp remove OpenAI
```

Then reinstall using the command from Step 3.3 above (use the same scope you originally installed with).

### MCP Server Not Showing Up

Check if the server is installed:

```text
claude mcp list
```

If not listed, follow Step 3 to install it.

### Server Won't Start

1. **Verify your API key** is valid at [OpenAI Platform](https://platform.openai.com/api-keys)

2. **Check Node.js version** (needs 18+):
   ```text
   node --version
   ```

3. **Ensure the server was built** — if `dist/index.js` is missing, run `npm install` again

### Connection Errors

1. **Check that `dist/index.js` exists** — if not, run `npm install`
2. **Verify the path is absolute** in your `claude mcp add` command
3. **Restart Claude Code** after any configuration changes

### Timeout Errors

- Reasoning and search tools use extended timeouts (3-5x base)
- Increase `OPENAI_TIMEOUT` environment variable for slow connections

### View Current Configuration

```text
claude mcp list
```

---

## Contributing

Pull requests welcome! Please keep it simple and beginner-friendly.

## License

MIT

---

Made for the Claude Code community
