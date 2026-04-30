import type { Recipe } from '../types';

export const anthropic: Recipe = {
  id: 'anthropic',
  name: 'Anthropic',
  tier: 'native',
  implementation: 'native-anthropic',
  auth_env: {
    required: ['ANTHROPIC_API_KEY'],
    setup_url: 'https://console.anthropic.com/settings/keys',
  },
  touchpoints: {
    fast: {
      models: ['claude-haiku-4-5-20251001', 'claude-haiku-4-5'],
      default: 'claude-haiku-4-5-20251001',
    },
    standard: {
      models: ['claude-sonnet-4-6', 'claude-sonnet-4', 'claude-sonnet-4-20250514'],
      default: 'claude-sonnet-4-6',
    },
    power: {
      models: ['claude-opus-4-6', 'claude-opus-4'],
      default: 'claude-opus-4-6',
    },
  },
  setup_hint: 'Set ANTHROPIC_API_KEY=sk-ant-api... in .env.local',
};
