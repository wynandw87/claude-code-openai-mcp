export interface Config {
  apiKey: string;
  defaultModel: string;
  timeout: number;
  outputDir: string;
}

export const TEXT_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'o4-mini',
  'o3',
  'o3-mini',
] as const;

export const IMAGE_MODELS = [
  'gpt-image-1',
] as const;

export const AUDIO_MODELS = [
  'gpt-4o-mini-tts',
  'tts-1',
  'tts-1-hd',
] as const;

export const TRANSCRIPTION_MODELS = [
  'whisper-1',
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
] as const;

export const REASONING_MODELS = [
  'o4-mini',
  'o3',
  'o3-mini',
] as const;

export function loadConfig(): Config {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.'
    );
  }

  const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4.1';
  const outputDir = process.env.OPENAI_OUTPUT_DIR || './generated-media';

  const timeoutStr = process.env.OPENAI_TIMEOUT;
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 60000;

  if (timeout <= 0) {
    throw new Error('OPENAI_TIMEOUT must be a positive number');
  }

  return {
    apiKey,
    defaultModel,
    timeout,
    outputDir
  };
}
