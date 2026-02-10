import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './config.js';

export interface SearchWebResponse {
  text: string;
  citations: Array<{ title: string; url: string }>;
}

export interface ReasoningResponse {
  text: string;
  reasoning: string;
}

export interface CodeExecutionResponse {
  text: string;
  code: string;
  output: string;
}

export interface UrlFetchResponse {
  text: string;
  citations: Array<{ title: string; url: string }>;
}

export interface FileUploadResponse {
  text: string;
  fileName: string;
  fileId: string;
}

export interface ImageGenerationResponse {
  images: Array<{ b64: string; revisedPrompt?: string }>;
}

export interface TranscriptionResponse {
  text: string;
}

export class OpenAIClient {
  private client: OpenAI;
  private timeout: number;

  constructor(config: Config) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.timeout = config.timeout;
  }

  async generate(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const input: OpenAI.Responses.ResponseCreateParams['input'] = [];
      if (systemPrompt) {
        input.push({ role: 'developer', content: systemPrompt });
      }
      input.push({ role: 'user', content: prompt });

      const response = await Promise.race([
        this.client.responses.create({
          model,
          input
        }),
        this.timeoutPromise(this.timeout)
      ]);

      return this.extractText(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async searchWeb(
    model: string,
    query: string,
    options?: {
      systemPrompt?: string;
    }
  ): Promise<SearchWebResponse> {
    try {
      const input: OpenAI.Responses.ResponseCreateParams['input'] = [];
      if (options?.systemPrompt) {
        input.push({ role: 'developer', content: options.systemPrompt });
      }
      input.push({ role: 'user', content: query });

      const response = await Promise.race([
        this.client.responses.create({
          model,
          input,
          tools: [{ type: 'web_search_preview' }]
        }),
        this.timeoutPromise(this.timeout * 3)
      ]);

      return this.extractSearchResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateWithReasoning(
    model: string,
    prompt: string,
    options?: {
      effort?: 'low' | 'medium' | 'high';
    }
  ): Promise<ReasoningResponse> {
    try {
      const response = await Promise.race([
        this.client.responses.create({
          model,
          input: [{ role: 'user', content: prompt }],
          reasoning: {
            effort: options?.effort || 'high'
          }
        }),
        this.timeoutPromise(this.timeout * 5)
      ]);

      return this.extractReasoningResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async executeCode(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<CodeExecutionResponse> {
    try {
      const input: OpenAI.Responses.ResponseCreateParams['input'] = [];
      if (systemPrompt) {
        input.push({ role: 'developer', content: systemPrompt });
      }
      input.push({ role: 'user', content: prompt });

      const response = await Promise.race([
        this.client.responses.create({
          model,
          input,
          tools: [{ type: 'code_interpreter', container: { type: 'auto' } }]
        }),
        this.timeoutPromise(this.timeout * 3)
      ]);

      return this.extractCodeExecutionResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async fetchUrl(
    model: string,
    prompt: string,
    urls: string[],
    systemPrompt?: string
  ): Promise<UrlFetchResponse> {
    try {
      const fullPrompt = `${prompt}\n\nURLs to analyze:\n${urls.map(u => `- ${u}`).join('\n')}`;

      const input: OpenAI.Responses.ResponseCreateParams['input'] = [];
      if (systemPrompt) {
        input.push({ role: 'developer', content: systemPrompt });
      }
      input.push({ role: 'user', content: fullPrompt });

      const response = await Promise.race([
        this.client.responses.create({
          model,
          input,
          tools: [{ type: 'web_search_preview' }]
        }),
        this.timeoutPromise(this.timeout * 3)
      ]);

      return this.extractUrlFetchResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Extensions supported by OpenAI Files API (purpose: 'assistants')
  private static UPLOAD_SUPPORTED_EXTENSIONS = new Set([
    '.c', '.css', '.csv', '.diff', '.html', '.htm', '.java', '.js', '.json',
    '.md', '.markdown', '.pdf', '.php', '.pl', '.pm', '.py', '.rb', '.rst',
    '.scala', '.sh', '.tex', '.txt', '.text', '.xml', '.yaml', '.yml',
    '.srt', '.vtt', '.eml', '.mjs', '.patch',
  ]);

  async uploadFile(
    model: string,
    filePath: string,
    query?: string
  ): Promise<FileUploadResponse> {
    try {
      const absolutePath = path.resolve(filePath);
      const fileName = path.basename(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();

      // Check if the file type is supported by OpenAI Files API
      if (OpenAIClient.UPLOAD_SUPPORTED_EXTENSIONS.has(ext)) {
        return this.uploadViaFilesApi(model, absolutePath, fileName, query);
      }

      // Fallback: read as text and pass inline for unsupported extensions
      // (e.g. .ts, .tsx, .go, .rs, .swift, .kt, .toml, .ini, .sql, etc.)
      return this.uploadViaInlineText(model, absolutePath, fileName, query);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private async uploadViaFilesApi(
    model: string,
    absolutePath: string,
    fileName: string,
    query?: string
  ): Promise<FileUploadResponse> {
    const file = await this.client.files.create({
      file: fs.createReadStream(absolutePath),
      purpose: 'assistants'
    });

    if (!query) {
      return {
        text: `File '${fileName}' uploaded successfully.\nFile ID: ${file.id}\n\nUse this file_id with the 'ask' tool's file_ids parameter to ask questions about it.`,
        fileName,
        fileId: file.id
      };
    }

    const input: OpenAI.Responses.ResponseCreateParams['input'] = [
      {
        role: 'user',
        content: [
          { type: 'input_file', file_id: file.id },
          { type: 'input_text', text: query }
        ]
      }
    ];

    const response = await Promise.race([
      this.client.responses.create({
        model,
        input
      }),
      this.timeoutPromise(this.timeout * 3)
    ]);

    return {
      text: this.extractText(response),
      fileName,
      fileId: file.id
    };
  }

  private async uploadViaInlineText(
    model: string,
    absolutePath: string,
    fileName: string,
    query?: string
  ): Promise<FileUploadResponse> {
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const ext = path.extname(absolutePath).toLowerCase().slice(1) || 'text';
    const promptText = query || 'Analyze this file and provide a detailed summary.';

    const fullPrompt = `File: ${fileName}\n\n\`\`\`${ext}\n${fileContent}\n\`\`\`\n\n${promptText}`;

    const response = await Promise.race([
      this.client.responses.create({
        model,
        input: [{ role: 'user', content: fullPrompt }]
      }),
      this.timeoutPromise(this.timeout * 3)
    ]);

    return {
      text: this.extractText(response),
      fileName,
      fileId: 'inline'
    };
  }

  async generateImage(
    prompt: string,
    options?: {
      size?: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
      quality?: 'auto' | 'low' | 'medium' | 'high';
      n?: number;
    }
  ): Promise<ImageGenerationResponse> {
    try {
      const response = await Promise.race([
        this.client.images.generate({
          model: 'gpt-image-1.5',
          prompt,
          size: options?.size || 'auto',
          quality: options?.quality || 'auto',
          n: options?.n || 1,
          output_format: 'png'
        }),
        this.timeoutPromise(this.timeout * 3)
      ]);

      const images: ImageGenerationResponse['images'] = [];
      if (response.data) {
        for (const img of response.data) {
          if (img.b64_json) {
            images.push({
              b64: img.b64_json,
              revisedPrompt: img.revised_prompt ?? undefined
            });
          }
        }
      }

      return { images };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async editImage(
    prompt: string,
    imagePath: string,
    options?: {
      maskPath?: string;
      size?: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
      quality?: 'auto' | 'low' | 'medium' | 'high';
    }
  ): Promise<ImageGenerationResponse> {
    try {
      const resolvedPath = path.resolve(imagePath);
      const imageBuffer = fs.readFileSync(resolvedPath);
      const mimeType = this.getImageMimeType(resolvedPath);
      const fileName = path.basename(resolvedPath);
      const imageFile = new File([imageBuffer], fileName, { type: mimeType });

      const params: any = {
        model: 'gpt-image-1.5',
        prompt,
        image: imageFile,
        size: options?.size || 'auto',
        quality: options?.quality || 'auto',
        output_format: 'png'
      };

      if (options?.maskPath) {
        const maskResolved = path.resolve(options.maskPath);
        const maskBuffer = fs.readFileSync(maskResolved);
        const maskMime = this.getImageMimeType(maskResolved);
        const maskName = path.basename(maskResolved);
        params.mask = new File([maskBuffer], maskName, { type: maskMime });
      }

      const response = await Promise.race([
        this.client.images.edit(params),
        this.timeoutPromise(this.timeout * 3)
      ]);

      const images: ImageGenerationResponse['images'] = [];
      if (response.data) {
        for (const img of response.data) {
          if (img.b64_json) {
            images.push({
              b64: img.b64_json,
              revisedPrompt: img.revised_prompt ?? undefined
            });
          }
        }
      }

      return { images };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async analyzeImage(
    model: string,
    prompt: string,
    imageBase64: string,
    mimeType: string
  ): Promise<string> {
    try {
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      const input: OpenAI.Responses.ResponseCreateParams['input'] = [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: dataUrl, detail: 'auto' },
            { type: 'input_text', text: prompt }
          ]
        }
      ];

      const response = await Promise.race([
        this.client.responses.create({
          model,
          input
        }),
        this.timeoutPromise(this.timeout * 2)
      ]);

      return this.extractText(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async textToSpeech(
    text: string,
    options?: {
      model?: string;
      voice?: string;
      speed?: number;
      format?: string;
    }
  ): Promise<Buffer> {
    try {
      const response = await Promise.race([
        this.client.audio.speech.create({
          model: options?.model || 'gpt-4o-mini-tts',
          voice: (options?.voice || 'alloy') as any,
          input: text,
          speed: options?.speed || 1.0,
          response_format: (options?.format || 'mp3') as any
        }),
        this.timeoutPromise(this.timeout * 2)
      ]);

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async transcribe(
    audioPath: string,
    options?: {
      model?: string;
      language?: string;
      prompt?: string;
    }
  ): Promise<TranscriptionResponse> {
    try {
      const response = await Promise.race([
        this.client.audio.transcriptions.create({
          model: options?.model || 'whisper-1',
          file: fs.createReadStream(path.resolve(audioPath)),
          language: options?.language,
          prompt: options?.prompt
        }),
        this.timeoutPromise(this.timeout * 3)
      ]);

      return { text: response.text };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private extractText(response: any): string {
    if (response.output) {
      const textParts: string[] = [];
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const part of item.content) {
            if (part.type === 'output_text') {
              textParts.push(part.text);
            }
          }
        }
      }
      if (textParts.length > 0) return textParts.join('');
    }
    return '';
  }

  private extractSearchResponse(response: any): SearchWebResponse {
    const text = this.extractText(response);
    const citations: SearchWebResponse['citations'] = [];

    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'web_search_call') {
          // web_search_call items don't contain citations directly
        }
        if (item.type === 'message' && item.content) {
          for (const part of item.content) {
            if (part.type === 'output_text' && part.annotations) {
              for (const ann of part.annotations) {
                if (ann.type === 'url_citation') {
                  citations.push({
                    title: ann.title || 'Untitled',
                    url: ann.url || ''
                  });
                }
              }
            }
          }
        }
      }
    }

    // Deduplicate citations by URL
    const seen = new Set<string>();
    const uniqueCitations = citations.filter(c => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    return { text, citations: uniqueCitations };
  }

  private extractReasoningResponse(response: any): ReasoningResponse {
    let reasoning = '';
    let text = '';

    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'reasoning') {
          if (item.summary) {
            for (const s of item.summary) {
              if (s.type === 'summary_text') {
                reasoning += s.text;
              }
            }
          }
        }
        if (item.type === 'message' && item.content) {
          for (const part of item.content) {
            if (part.type === 'output_text') {
              text += part.text;
            }
          }
        }
      }
    }

    return { text, reasoning };
  }

  private extractCodeExecutionResponse(response: any): CodeExecutionResponse {
    let text = '';
    let code = '';
    let output = '';

    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'code_interpreter_call') {
          if (item.code) code += (code ? '\n' : '') + item.code;
          if (item.results) {
            for (const result of item.results) {
              if (result.type === 'logs') {
                output += (output ? '\n' : '') + result.logs;
              }
            }
          }
        }
        if (item.type === 'message' && item.content) {
          for (const part of item.content) {
            if (part.type === 'output_text') {
              text += part.text;
            }
          }
        }
      }
    }

    return { text, code, output };
  }

  private extractUrlFetchResponse(response: any): UrlFetchResponse {
    const searchResp = this.extractSearchResponse(response);
    return {
      text: searchResp.text,
      citations: searchResp.citations
    };
  }

  private getImageMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'image/png';
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    );
  }

  private handleError(error: any): Error {
    if (error.message === 'Request timeout') {
      return new Error('OpenAI API request timed out. Please try again.');
    }
    if (error.status === 401 || error.status === 403) {
      return new Error(
        'Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.'
      );
    }
    if (error.status === 429) {
      return new Error(
        'OpenAI API rate limit exceeded. Please wait a moment and try again.'
      );
    }
    if (error.status === 400 && error.message?.includes('safety')) {
      return new Error(
        "Content blocked by OpenAI's safety filters. Try rephrasing your request."
      );
    }
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('fetch')
    ) {
      return new Error(`Failed to connect to OpenAI API: ${error.message}`);
    }
    return new Error(`OpenAI API error: ${error.message || error}`);
  }
}

export function createOpenAIClient(config: Config): OpenAIClient {
  return new OpenAIClient(config);
}
