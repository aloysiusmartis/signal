import type { Recipe } from '../types';

export const google: Recipe = {
  id: 'google',
  name: 'Google',
  tier: 'native',
  implementation: 'native-google',
  auth_env: {
    required: ['GOOGLE_GENERATIVE_AI_API_KEY'],
    setup_url: 'https://aistudio.google.com/app/apikey',
  },
  touchpoints: {
    fast: {
      models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
      default: 'gemini-2.0-flash',
    },
    standard: {
      models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
      default: 'gemini-2.5-flash',
    },
    power: {
      models: ['gemini-2.5-pro'],
      default: 'gemini-2.5-pro',
    },
  },
  setup_hint: 'Set GOOGLE_GENERATIVE_AI_API_KEY=... in .env.local',
};
