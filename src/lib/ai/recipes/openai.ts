import type { Recipe } from '../types';

export const openai: Recipe = {
  id: 'openai',
  name: 'OpenAI',
  tier: 'native',
  implementation: 'native-openai',
  auth_env: {
    required: ['OPENAI_API_KEY'],
    setup_url: 'https://platform.openai.com/api-keys',
  },
  touchpoints: {
    fast: {
      models: ['gpt-4o-mini', 'gpt-4.1-mini'],
      default: 'gpt-4o-mini',
    },
    standard: {
      models: ['gpt-4o', 'gpt-4.1'],
      default: 'gpt-4o',
    },
    power: {
      models: ['o3', 'gpt-4o'],
      default: 'o3',
    },
  },
  setup_hint: 'Set OPENAI_API_KEY=sk-proj-... in .env.local',
};
