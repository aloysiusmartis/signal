import { describe, expect, it } from 'vitest';
import { listRecipes, getRecipe, RECIPES } from '@/lib/ai/recipes/index';

describe('recipe registry', () => {
  it('contains exactly 4 recipes', () => {
    expect(listRecipes()).toHaveLength(4);
  });

  it('contains anthropic, openai, google, ollama', () => {
    const ids = listRecipes().map(r => r.id);
    expect(ids).toContain('anthropic');
    expect(ids).toContain('openai');
    expect(ids).toContain('google');
    expect(ids).toContain('ollama');
  });

  it('RECIPES map keys match recipe ids', () => {
    for (const [key, recipe] of RECIPES) {
      expect(recipe.id).toBe(key);
    }
  });

  it('getRecipe returns undefined for unknown provider', () => {
    expect(getRecipe('voyage')).toBeUndefined();
    expect(getRecipe('litellm')).toBeUndefined();
  });
});

describe('each recipe', () => {
  it('declares all three tiers (fast / standard / power)', () => {
    for (const recipe of listRecipes()) {
      expect(recipe.touchpoints.fast, `${recipe.id} missing fast tier`).toBeDefined();
      expect(recipe.touchpoints.standard, `${recipe.id} missing standard tier`).toBeDefined();
      expect(recipe.touchpoints.power, `${recipe.id} missing power tier`).toBeDefined();
    }
  });

  it('each tier has a non-empty default model', () => {
    for (const recipe of listRecipes()) {
      for (const tier of ['fast', 'standard', 'power'] as const) {
        const tc = recipe.touchpoints[tier]!;
        expect(tc.default, `${recipe.id}/${tier} default is empty`).toBeTruthy();
        expect(tc.models, `${recipe.id}/${tier} models list is empty`).not.toHaveLength(0);
      }
    }
  });

  it('anthropic requires ANTHROPIC_API_KEY', () => {
    const recipe = getRecipe('anthropic')!;
    expect(recipe.auth_env?.required).toContain('ANTHROPIC_API_KEY');
  });

  it('openai requires OPENAI_API_KEY', () => {
    const recipe = getRecipe('openai')!;
    expect(recipe.auth_env?.required).toContain('OPENAI_API_KEY');
  });

  it('google requires GOOGLE_GENERATIVE_AI_API_KEY', () => {
    const recipe = getRecipe('google')!;
    expect(recipe.auth_env?.required).toContain('GOOGLE_GENERATIVE_AI_API_KEY');
  });

  it('ollama has no required auth (local provider)', () => {
    const recipe = getRecipe('ollama')!;
    expect(recipe.auth_env?.required ?? []).toHaveLength(0);
  });

  it('ollama is openai-compatible implementation', () => {
    expect(getRecipe('ollama')!.implementation).toBe('openai-compatible');
  });
});
