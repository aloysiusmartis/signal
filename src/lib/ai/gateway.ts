/**
 * AI Gateway — single seam for every LLM call in signal.
 *
 * Exports:
 *   getModel(tier)      — returns a LanguageModel for use with streamText / generateObject
 *   isAvailable(tier)   — true if the configured provider has required API keys
 *
 * Configuration via env vars (all optional, defaults to Anthropic):
 *   AI_FAST_MODEL     = "anthropic:claude-haiku-4-5-20251001"  (batch processing)
 *   AI_STANDARD_MODEL = "anthropic:claude-sonnet-4-6"          (chat, scoring)
 *   AI_POWER_MODEL    = "anthropic:claude-opus-4-6"            (email composition)
 *   OLLAMA_BASE_URL   = "http://localhost:11434/v1"            (ollama only)
 *
 * Provider:model format is required. Bare model IDs (e.g. "claude-haiku-4-5") throw.
 *
 * Design:
 *   - Reads process.env once at module load (Next.js serverless cold-start).
 *   - Never reads process.env at call time (consistent, testable).
 *   - Model instances are cached by (provider:modelId:baseUrl).
 *   - Stagehand's modelName in runner.ts is a separate system — not routed here.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import type { AIGatewayConfig, TouchpointTier, Recipe } from './types';
import { resolveRecipe } from './model-resolver';
import { AIConfigError, normalizeAIError } from './errors';

const DEFAULT_FAST_MODEL     = 'anthropic:claude-haiku-4-5-20251001';
const DEFAULT_STANDARD_MODEL = 'anthropic:claude-sonnet-4-6';
const DEFAULT_POWER_MODEL    = 'anthropic:claude-opus-4-6';

function buildConfigFromEnv(): AIGatewayConfig {
  return {
    fast_model:     process.env.AI_FAST_MODEL     ?? DEFAULT_FAST_MODEL,
    standard_model: process.env.AI_STANDARD_MODEL ?? DEFAULT_STANDARD_MODEL,
    power_model:    process.env.AI_POWER_MODEL    ?? DEFAULT_POWER_MODEL,
    base_urls: {
      ollama: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
    },
    env: {
      ANTHROPIC_API_KEY:          process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY:             process.env.OPENAI_API_KEY,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
  };
}

let _config: AIGatewayConfig = buildConfigFromEnv();
const _modelCache = new Map<string, LanguageModel>();

/** Reset config from process.env. Call in tests after mutating process.env. */
export function _resetGateway(): void {
  _config = buildConfigFromEnv();
  _modelCache.clear();
}

function tierToModelStr(tier: TouchpointTier): string {
  switch (tier) {
    case 'fast':     return _config.fast_model;
    case 'standard': return _config.standard_model;
    case 'power':    return _config.power_model;
  }
}

function instantiate(recipe: Recipe, modelId: string): LanguageModel {
  switch (recipe.implementation) {
    case 'native-anthropic': {
      const apiKey = _config.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new AIConfigError(
        `Anthropic model "${modelId}" requires ANTHROPIC_API_KEY.`,
        recipe.setup_hint,
      );
      return createAnthropic({ apiKey })(modelId);
    }
    case 'native-openai': {
      const apiKey = _config.env.OPENAI_API_KEY;
      if (!apiKey) throw new AIConfigError(
        `OpenAI model "${modelId}" requires OPENAI_API_KEY.`,
        recipe.setup_hint,
      );
      return createOpenAI({ apiKey })(modelId);
    }
    case 'native-google': {
      const apiKey = _config.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new AIConfigError(
        `Google model "${modelId}" requires GOOGLE_GENERATIVE_AI_API_KEY.`,
        recipe.setup_hint,
      );
      return createGoogleGenerativeAI({ apiKey })(modelId);
    }
    case 'openai-compatible': {
      const baseUrl = _config.base_urls[recipe.id] ?? recipe.base_url_default;
      if (!baseUrl) throw new AIConfigError(
        `${recipe.name} requires a base URL.`,
        recipe.setup_hint,
      );
      return createOpenAICompatible({
        name: recipe.id,
        baseURL: baseUrl,
        apiKey: 'unauthenticated',
      })(modelId);
    }
    default: {
      const exhaustive: never = recipe.implementation;
      throw new AIConfigError(`Unknown implementation: ${exhaustive}`);
    }
  }
}

/**
 * Returns a LanguageModel for the given tier, ready to pass to streamText / generateObject.
 * Throws AIConfigError if the provider's API key is missing.
 */
export function getModel(tier: TouchpointTier): LanguageModel {
  const modelStr = tierToModelStr(tier);
  const { parsed, recipe } = resolveRecipe(modelStr);

  const cacheKey = `${recipe.id}:${parsed.modelId}:${_config.base_urls[recipe.id] ?? ''}`;
  const cached = _modelCache.get(cacheKey);
  if (cached) return cached;

  try {
    const model = instantiate(recipe, parsed.modelId);
    _modelCache.set(cacheKey, model);
    return model;
  } catch (err) {
    throw normalizeAIError(err, `getModel(${tier})`);
  }
}

/**
 * Returns the resolved provider id and model id for a tier without instantiating
 * a model. Cheap to call from cost-tracking onFinish handlers.
 */
export function getModelInfo(tier: TouchpointTier): { provider: string; modelId: string } {
  const modelStr = tierToModelStr(tier);
  const { parsed } = resolveRecipe(modelStr);
  return { provider: parsed.providerId, modelId: parsed.modelId };
}

/**
 * Returns a LanguageModel for an explicit "provider:modelId" string.
 * Use in recipe-driven steps that can specify their own model (e.g. extract_json).
 * Throws AIConfigError for bare model IDs or unknown providers.
 */
export function getModelByString(modelStr: string): LanguageModel {
  const { parsed, recipe } = resolveRecipe(modelStr);
  const cacheKey = `${recipe.id}:${parsed.modelId}:${_config.base_urls[recipe.id] ?? ''}`;
  const cached = _modelCache.get(cacheKey);
  if (cached) return cached;
  try {
    const model = instantiate(recipe, parsed.modelId);
    _modelCache.set(cacheKey, model);
    return model;
  } catch (err) {
    throw normalizeAIError(err, `getModelByString(${modelStr})`);
  }
}

/**
 * Returns true if the configured provider for this tier has its required API key set.
 * Useful for graceful degradation in optional AI paths.
 */
export function isAvailable(tier: TouchpointTier): boolean {
  try {
    const modelStr = tierToModelStr(tier);
    const { recipe } = resolveRecipe(modelStr);
    const required = recipe.auth_env?.required ?? [];
    if (required.length === 0) return true;
    return required.every(k => !!_config.env[k as keyof typeof _config.env]);
  } catch {
    return false;
  }
}
