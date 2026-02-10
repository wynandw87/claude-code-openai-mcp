#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config.js';
import { createOpenAIClient } from './openai-client.js';
import {
  BRAINSTORM_PROMPT, CODE_REVIEW_PROMPT, EXPLAIN_PROMPT,
  SEARCH_WEB_PROMPT, CODE_EXECUTION_PROMPT, URL_CONTEXT_PROMPT
} from './prompts.js';

async function main() {
  try {
    const config = loadConfig();
    const client = createOpenAIClient(config);

    const server = new Server(
      {
        name: 'openai-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ask',
            description: "Ask OpenAI a question and get the response directly in Claude's context. Trigger: 'use openai', 'ask openai', or 'openai:' followed by a question.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or prompt for OpenAI',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                },
                file_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File IDs from previous upload_file calls to include as context'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'code_review',
            description: "Have OpenAI review code and return feedback directly to Claude. Trigger: 'openai review', 'openai code review', or 'have openai review'.",
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The code to review',
                  maxLength: 500000
                },
                focus: {
                  type: 'string',
                  description: 'Specific focus area (security, performance, etc.)',
                  default: 'general'
                }
              },
              required: ['code']
            }
          },
          {
            name: 'brainstorm',
            description: "Brainstorm solutions with OpenAI, response visible to Claude. Trigger: 'openai brainstorm', 'brainstorm with openai', or 'openai ideas'.",
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'The topic to brainstorm about',
                  maxLength: 100000
                },
                context: {
                  type: 'string',
                  description: 'Additional context',
                  default: '',
                  maxLength: 100000
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'explain',
            description: "Clear explanations of concepts, code, or technical topics using OpenAI. Trigger: 'openai explain'.",
            inputSchema: {
              type: 'object',
              properties: {
                concept: {
                  type: 'string',
                  description: 'What to explain (code, concept, or technical topic)'
                }
              },
              required: ['concept']
            }
          },
          {
            name: 'search_web',
            description: "Search the web using OpenAI with real-time results and citations. Trigger: 'openai search', 'openai web search', or 'search with openai'.",
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query or question to research on the web',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'search_with_reasoning',
            description: "Query OpenAI with extended reasoning enabled. Shows the model's thought process alongside its answer. Best for complex reasoning tasks. Trigger: 'openai reason', 'openai think'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or problem requiring deep reasoning',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to o4-mini). Reasoning models: o4-mini, o3, o3-mini.'
                },
                effort: {
                  type: 'string',
                  description: 'Reasoning effort: "low", "medium", "high" (default: "high")',
                  enum: ['low', 'medium', 'high']
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'run_code',
            description: "Execute Python code in OpenAI's sandboxed environment with NumPy, Pandas, Matplotlib, SciPy. Useful for calculations, data analysis, and generating visualizations. Trigger: 'openai run code', 'openai execute', or 'openai calculate'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of what to compute or analyze. OpenAI will write and execute Python code automatically.',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'fetch_url',
            description: "Fetch and analyze web page content using OpenAI's web search. Provide URLs and a question about their content. Trigger: 'openai fetch url'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Question or instruction about the URL content'
                },
                urls: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'URLs to fetch and analyze (max 20)',
                  maxItems: 20
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                }
              },
              required: ['prompt', 'urls']
            }
          },
          {
            name: 'upload_file',
            description: "Upload a document for OpenAI to analyze. Supports any text-based file: txt, md, py, js, ts, csv, json, pdf, go, rs, and more. Files with unsupported extensions are read inline as text. Trigger: 'openai upload file', 'upload to openai'.",
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Absolute path to the file to upload'
                },
                query: {
                  type: 'string',
                  description: 'Optional question to ask about the file immediately after upload',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'generate_image',
            description: "Generate images using OpenAI's gpt-image-1 model. Returns the image inline and saves to disk. Trigger: 'openai generate image', 'openai image', or 'openai create image'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Image generation prompt describing what to create',
                  maxLength: 100000
                },
                size: {
                  type: 'string',
                  description: 'Image size: "auto", "1024x1024", "1536x1024", "1024x1536"',
                  enum: ['auto', '1024x1024', '1536x1024', '1024x1536']
                },
                quality: {
                  type: 'string',
                  description: 'Image quality: "auto", "low", "medium", "high"',
                  enum: ['auto', 'low', 'medium', 'high']
                },
                n: {
                  type: 'integer',
                  description: 'Number of images to generate (1-10)',
                  default: 1,
                  minimum: 1,
                  maximum: 10
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the image. If not provided, auto-saves to output directory.'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'edit_image',
            description: "Edit an existing image using OpenAI's gpt-image-1 model. Provide a source image and edit instructions. Trigger: 'openai edit image'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Edit instructions describing what changes to make'
                },
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image file to edit'
                },
                mask_path: {
                  type: 'string',
                  description: 'Optional absolute path to a mask image (transparent areas indicate where to edit)'
                },
                size: {
                  type: 'string',
                  description: 'Output size: "auto", "1024x1024", "1536x1024", "1024x1536"',
                  enum: ['auto', '1024x1024', '1536x1024', '1024x1536']
                },
                quality: {
                  type: 'string',
                  description: 'Image quality: "auto", "low", "medium", "high"',
                  enum: ['auto', 'low', 'medium', 'high']
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the edited image. If not provided, auto-saves to output directory.'
                }
              },
              required: ['prompt', 'image_path']
            }
          },
          {
            name: 'analyze_image',
            description: "Analyze an image using OpenAI's vision model. Provide a file path and optional prompt. Trigger: 'openai analyze image', 'openai describe image', or 'openai vision'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the image file to analyze'
                },
                prompt: {
                  type: 'string',
                  description: 'Question or instruction about the image',
                  default: 'Describe this image in detail',
                  maxLength: 100000
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gpt-4.1)'
                }
              },
              required: ['image_path']
            }
          },
          {
            name: 'text_to_speech',
            description: "Convert text to speech using OpenAI's TTS models. Saves audio file to disk. Trigger: 'openai tts', 'openai speak', or 'openai text to speech'.",
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The text to convert to speech',
                  maxLength: 100000
                },
                voice: {
                  type: 'string',
                  description: 'Voice to use: "alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"',
                  enum: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']
                },
                model: {
                  type: 'string',
                  description: 'TTS model: "gpt-4o-mini-tts" (default), "tts-1", "tts-1-hd"'
                },
                speed: {
                  type: 'number',
                  description: 'Speech speed (0.25 to 4.0, default: 1.0)',
                  minimum: 0.25,
                  maximum: 4.0
                },
                format: {
                  type: 'string',
                  description: 'Output format: "mp3" (default), "opus", "aac", "flac", "wav", "pcm"',
                  enum: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the audio. If not provided, auto-saves to output directory.'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'transcribe',
            description: "Transcribe audio to text using OpenAI's Whisper model. Trigger: 'openai transcribe', 'openai speech to text'.",
            inputSchema: {
              type: 'object',
              properties: {
                audio_path: {
                  type: 'string',
                  description: 'Absolute path to the audio file to transcribe (mp3, mp4, mpeg, mpga, m4a, wav, webm)'
                },
                model: {
                  type: 'string',
                  description: 'Transcription model: "whisper-1" (default), "gpt-4o-transcribe", "gpt-4o-mini-transcribe"'
                },
                language: {
                  type: 'string',
                  description: 'Language code in ISO-639-1 format (e.g., "en", "es", "fr")'
                },
                prompt: {
                  type: 'string',
                  description: 'Optional prompt to guide the transcription style or provide context'
                }
              },
              required: ['audio_path']
            }
          }
        ]
      };
    });

    // Helper: save binary to disk
    function saveFile(data: Buffer, savePath: string): string {
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(savePath, data);
      return savePath;
    }

    // Helper: save base64 image to disk
    function saveImage(base64Data: string, savePath: string): string {
      const buffer = Buffer.from(base64Data, 'base64');
      return saveFile(buffer, savePath);
    }

    // Helper: generate auto save path
    function getAutoSavePath(outputDir: string, prefix: string, ext: string = 'png'): string {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${prefix}-${timestamp}.${ext}`;
      return path.resolve(outputDir, filename);
    }

    // Helper: detect mime type from file extension
    function getMimeType(filePath: string): string {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
      };
      return mimeTypes[ext] || 'image/png';
    }

    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'ask': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional(),
              file_ids: z.array(z.string()).optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;
            const response = await client.generate(model, input.prompt);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'code_review': {
            const schema = z.object({
              code: z.string().min(1),
              focus: z.string().optional()
            });
            const input = schema.parse(args);
            const focus = input.focus || 'general';
            const prompt = `Please review this code with a focus on ${focus}:\n\n\`\`\`\n${input.code}\n\`\`\`\n\nProvide specific, actionable feedback on:\n1. Potential issues or bugs\n2. Security concerns\n3. Performance optimizations\n4. Best practices\n5. Code clarity and maintainability`;
            const response = await client.generate(config.defaultModel, prompt, CODE_REVIEW_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'brainstorm': {
            const schema = z.object({
              topic: z.string().min(1),
              context: z.string().optional()
            });
            const input = schema.parse(args);
            let prompt = `Brainstorm ideas about: ${input.topic}`;
            if (input.context) {
              prompt += `\n\nContext: ${input.context}`;
            }
            prompt += '\n\nProvide creative ideas, alternatives, and considerations.';
            const response = await client.generate(config.defaultModel, prompt, BRAINSTORM_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'explain': {
            const schema = z.object({
              concept: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Explain: ${input.concept}`;
            const response = await client.generate('gpt-4.1-mini', prompt, EXPLAIN_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'search_web': {
            const schema = z.object({
              query: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.searchWeb(model, input.query, {
              systemPrompt: SEARCH_WEB_PROMPT
            });

            let responseText = result.text;
            if (result.citations.length > 0) {
              responseText += '\n\n---\n**Sources:**\n';
              for (const citation of result.citations) {
                responseText += `- [${citation.title}](${citation.url})\n`;
              }
            }

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'search_with_reasoning': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional(),
              effort: z.enum(['low', 'medium', 'high']).optional()
            });
            const input = schema.parse(args);
            const model = input.model || 'o4-mini';

            const result = await client.generateWithReasoning(model, input.prompt, {
              effort: input.effort
            });

            let responseText = '';
            if (result.reasoning) {
              responseText += `<reasoning>\n${result.reasoning}\n</reasoning>\n\n`;
            }
            responseText += result.text;

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'run_code': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.executeCode(model, input.prompt, CODE_EXECUTION_PROMPT);

            let responseText = result.text;
            if (result.code) {
              responseText += '\n\n```python\n' + result.code + '\n```';
            }
            if (result.output) {
              responseText += '\n\n**Output:**\n```\n' + result.output + '\n```';
            }

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'fetch_url': {
            const schema = z.object({
              prompt: z.string().min(1),
              urls: z.array(z.string()).min(1).max(20),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.fetchUrl(model, input.prompt, input.urls, URL_CONTEXT_PROMPT);

            let responseText = result.text;
            if (result.citations.length > 0) {
              responseText += '\n\n---\n**Sources:**\n';
              for (const citation of result.citations) {
                responseText += `- [${citation.title}](${citation.url})\n`;
              }
            }

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'upload_file': {
            const schema = z.object({
              file_path: z.string().min(1),
              query: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const filePath = path.resolve(input.file_path);
            if (!fs.existsSync(filePath)) {
              return {
                content: [{ type: 'text', text: `File not found: ${filePath}` }],
                isError: true
              };
            }

            const result = await client.uploadFile(model, filePath, input.query);

            let responseText = result.text;
            responseText += `\n\n---\n*File: ${result.fileName} (ID: ${result.fileId})*`;

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'generate_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              size: z.enum(['auto', '1024x1024', '1536x1024', '1024x1536']).optional(),
              quality: z.enum(['auto', 'low', 'medium', 'high']).optional(),
              n: z.number().int().min(1).max(10).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            const result = await client.generateImage(input.prompt, {
              size: input.size,
              quality: input.quality,
              n: input.n
            });

            if (result.images.length === 0) {
              return {
                content: [{ type: 'text', text: 'No image was generated. The model may have declined the request or encountered a safety filter. Try rephrasing your prompt.' }],
                isError: true
              };
            }

            const content: any[] = [];

            for (let i = 0; i < result.images.length; i++) {
              const img = result.images[i];
              let savePath: string;

              if (input.save_path && result.images.length === 1) {
                savePath = input.save_path;
              } else if (input.save_path) {
                const ext = path.extname(input.save_path);
                const base = input.save_path.slice(0, -ext.length);
                savePath = `${base}_${i}${ext}`;
              } else {
                savePath = getAutoSavePath(config.outputDir, 'generated');
              }

              const savedTo = saveImage(img.b64, savePath);

              content.push({
                type: 'image',
                data: img.b64,
                mimeType: 'image/png'
              });

              let textParts = [`Image ${i + 1} saved to: ${savedTo}`];
              if (img.revisedPrompt) {
                textParts.push(`\nRevised prompt: ${img.revisedPrompt}`);
              }
              content.push({ type: 'text', text: textParts.join('') });
            }

            return { content };
          }

          case 'edit_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              image_path: z.string().min(1),
              mask_path: z.string().optional(),
              size: z.enum(['auto', '1024x1024', '1536x1024', '1024x1536']).optional(),
              quality: z.enum(['auto', 'low', 'medium', 'high']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            const imagePath = path.resolve(input.image_path);
            if (!fs.existsSync(imagePath)) {
              return {
                content: [{ type: 'text', text: `Source image not found: ${imagePath}` }],
                isError: true
              };
            }

            if (input.mask_path) {
              const maskPath = path.resolve(input.mask_path);
              if (!fs.existsSync(maskPath)) {
                return {
                  content: [{ type: 'text', text: `Mask image not found: ${maskPath}` }],
                  isError: true
                };
              }
            }

            const result = await client.editImage(input.prompt, imagePath, {
              maskPath: input.mask_path,
              size: input.size,
              quality: input.quality
            });

            if (result.images.length === 0) {
              return {
                content: [{ type: 'text', text: 'No edited image was generated. The model may have declined the request or encountered a safety filter. Try rephrasing your prompt.' }],
                isError: true
              };
            }

            const image = result.images[0];
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'edited');
            const savedTo = saveImage(image.b64, savePath);

            const content: any[] = [];

            content.push({
              type: 'image',
              data: image.b64,
              mimeType: 'image/png'
            });

            let textParts = [`Edited image saved to: ${savedTo}`];
            if (image.revisedPrompt) {
              textParts.push(`\nRevised prompt: ${image.revisedPrompt}`);
            }
            content.push({ type: 'text', text: textParts.join('') });

            return { content };
          }

          case 'analyze_image': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;
            const prompt = input.prompt || 'Describe this image in detail';

            const imagePath = path.resolve(input.image_path);
            if (!fs.existsSync(imagePath)) {
              return {
                content: [{ type: 'text', text: `Image not found: ${imagePath}` }],
                isError: true
              };
            }

            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            const mimeType = getMimeType(imagePath);

            const response = await client.analyzeImage(model, prompt, imageBase64, mimeType);

            return { content: [{ type: 'text', text: response }] };
          }

          case 'text_to_speech': {
            const schema = z.object({
              text: z.string().min(1),
              voice: z.enum(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']).optional(),
              model: z.string().optional(),
              speed: z.number().min(0.25).max(4.0).optional(),
              format: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);
            const format = input.format || 'mp3';

            const audioBuffer = await client.textToSpeech(input.text, {
              model: input.model,
              voice: input.voice,
              speed: input.speed,
              format
            });

            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'speech', format);
            const savedTo = saveFile(audioBuffer, savePath);

            return {
              content: [{ type: 'text', text: `Audio saved to: ${savedTo}\nVoice: ${input.voice || 'alloy'}\nFormat: ${format}\nSize: ${(audioBuffer.length / 1024).toFixed(1)} KB` }]
            };
          }

          case 'transcribe': {
            const schema = z.object({
              audio_path: z.string().min(1),
              model: z.string().optional(),
              language: z.string().optional(),
              prompt: z.string().optional()
            });
            const input = schema.parse(args);

            const audioPath = path.resolve(input.audio_path);
            if (!fs.existsSync(audioPath)) {
              return {
                content: [{ type: 'text', text: `Audio file not found: ${audioPath}` }],
                isError: true
              };
            }

            const result = await client.transcribe(audioPath, {
              model: input.model,
              language: input.language,
              prompt: input.prompt
            });

            return {
              content: [{ type: 'text', text: `**Transcription:**\n\n${result.text}` }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: error.message || 'An error occurred' }],
          isError: true
        };
      }
    });

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('OpenAI MCP Server v1.0.0 running');

    process.on('SIGINT', async () => {
      console.error('Shutting down OpenAI MCP Server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down OpenAI MCP Server...');
      await server.close();
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Failed to start OpenAI MCP Server:', error.message);
    process.exit(1);
  }
}

main();
