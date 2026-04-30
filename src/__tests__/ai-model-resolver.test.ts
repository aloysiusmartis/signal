import { describe, expect, it } from 'vitest';
import { parseModelId, resolveRecipe } from '@/lib/ai/model-resolver';
import { AIConfigError } from '@/lib/ai/errors';

describe('parseModelId', () => {
  it('parses a valid provider:modelId string', () => {
    const result = parseModelId('anthropic:claude-haiku-4-5-20251001');
    expect(result).toEqual({
      providerId: 'anthropic',
      modelId: 'claude-haiku-4-5-20251001',
    });
  });

  it('parses openai provider', () => {
    const result = parseModelId('openai:gpt-4o');
    expect(result).toEqual({ providerId: 'openai', modelId: 'gpt-4o' });
  });

  it('parses google provider', () => {
    const result = parseModelId('google:gemini-2.5-pro');
    expect(result).toEqual({ providerId: 'google', modelId: 'gemini-2.5-pro' });
  });

  it('throws AIConfigError for bare model IDs (no colon)', () => {
    expect(() => parseModelId('claude-haiku-4-5-20251001')).toThrow(AIConfigError);
  });

  it('error message instructs to use provider:modelId format', () => {
    expect(() => parseModelId('claude-haiku-4-5')).toThrow(/provider:modelId/);
  });

  it('throws for empty string', () => {
    expect(() => parseModelId('')).toThrow(AIConfigError);
  });

  it('throws for colon-only string', () => {
    expect(() => parseModelId(':')).toThrow(AIConfigError);
  });
});

describe('resolveRecipe', () => {
  it('resolves anthropic provider to its recipe', () => {
    const { parsed, recipe } = resolveRecipe('anthropic:claude-haiku-4-5-20251001');
    expect(parsed.providerId).toBe('anthropic');
    expect(recipe.id).toBe('anthropic');
    expect(recipe.implementation).toBe('native-anthropic');
  });

  it('resolves openai provider to its recipe', () => {
    const { recipe } = resolveRecipe('openai:gpt-4o-mini');
    expect(recipe.id).toBe('openai');
  });

  it('resolves ollama provider to its recipe', () => {
    const { recipe } = resolveRecipe('ollama:llama3.2');
    expect(recipe.implementation).toBe('openai-compatible');
  });

  it('throws AIConfigError for unknown provider', () => {
    expect(() => resolveRecipe('voyage:model')).toThrow(AIConfigError);
    expect(() => resolveRecipe('voyage:model')).toThrow(/Known providers/);
  });
});
