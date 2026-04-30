import type { Recipe } from '../types';

export const ollama: Recipe = {
  id: 'ollama',
  name: 'Ollama (local)',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'http://localhost:11434/v1',
  touchpoints: {
    fast: {
      models: ['llama3.2', 'qwen2.5:3b'],
      default: 'llama3.2',
    },
    standard: {
      models: ['llama3.3', 'qwen2.5:14b'],
      default: 'llama3.3',
    },
    power: {
      models: ['llama3.3:70b', 'qwen2.5:72b'],
      default: 'llama3.3:70b',
    },
  },
  setup_hint: 'Install Ollama (https://ollama.ai) and run: ollama pull llama3.2',
};
