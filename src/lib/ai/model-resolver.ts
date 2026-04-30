import type { ParsedModelId, Recipe } from './types';
import { AIConfigError } from './errors';
import { getRecipe } from './recipes/index';

export function parseModelId(modelStr: string): ParsedModelId {
  if (!modelStr.includes(':')) {
    throw new AIConfigError(
      `Model string "${modelStr}" must use "provider:modelId" format (e.g. "anthropic:claude-haiku-4-5-20251001").`,
      'Check AI_FAST_MODEL / AI_STANDARD_MODEL / AI_POWER_MODEL in .env.local',
    );
  }
  const colonIdx = modelStr.indexOf(':');
  const providerId = modelStr.slice(0, colonIdx);
  const modelId = modelStr.slice(colonIdx + 1);
  if (!providerId || !modelId) {
    throw new AIConfigError(`Malformed model string: "${modelStr}".`);
  }
  return { providerId, modelId };
}

export function resolveRecipe(modelStr: string): { parsed: ParsedModelId; recipe: Recipe } {
  const parsed = parseModelId(modelStr);
  const recipe = getRecipe(parsed.providerId);
  if (!recipe) {
    throw new AIConfigError(
      `Unknown provider "${parsed.providerId}" in "${modelStr}". Known providers: anthropic, openai, google, ollama`,
    );
  }
  return { parsed, recipe };
}
