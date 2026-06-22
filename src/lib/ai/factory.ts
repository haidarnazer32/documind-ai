import { AIProvider } from './base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

export interface AIProviderConfig {
  type: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export class AIProviderFactory {
  static createProvider(config: AIProviderConfig): AIProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(
          new OpenAI({ apiKey: config.apiKey }),
          config.model ?? 'gpt-4o'
        );
      case 'anthropic':
        return new AnthropicProvider(
          new Anthropic({ apiKey: config.apiKey }),
          config.model ?? 'claude-3-5-sonnet-20241022'
        );
      default:
        throw new Error(`Unsupported AI provider: ${config.type}`);
    }
  }
}