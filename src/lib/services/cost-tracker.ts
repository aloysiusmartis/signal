import { AsyncLocalStorage } from "node:async_hooks";

import { getAdminClient } from "@/lib/supabase/admin";

// ── Pricing constants (USD) ──────────────────────────────────────────────
// Last verified 2026-04-29. Sources:
//   Claude  -- https://docs.anthropic.com/en/docs/about-claude/pricing
//   OpenAI  -- https://openai.com/api/pricing
//   Google  -- https://ai.google.dev/gemini-api/docs/pricing
//   Exa     -- https://exa.ai/pricing (March 2026: contents bundled into search)
//   Apify   -- https://apify.com/pricing (pay-per-result actors)
//   BB      -- https://browserbase.com/pricing
export const PRICING = {
  // Claude Sonnet 4 (per million tokens)
  claude_sonnet_input: 3.0,
  claude_sonnet_output: 15.0,
  claude_sonnet_cache_read: 0.3,
  claude_sonnet_cache_write: 3.75,
  // Claude Haiku 4.5 (per million tokens)
  claude_haiku_input: 1.0,
  claude_haiku_output: 5.0,
  claude_haiku_cache_read: 0.1,
  claude_haiku_cache_write: 1.25,
  // Claude Opus 4 (per million tokens)
  claude_opus_input: 15.0,
  claude_opus_output: 75.0,
  claude_opus_cache_read: 1.5,
  claude_opus_cache_write: 18.75,
  // OpenAI GPT-4o (per million tokens)
  openai_gpt4o_input: 2.5,
  openai_gpt4o_output: 10.0,
  // OpenAI GPT-4o-mini (per million tokens)
  openai_gpt4o_mini_input: 0.15,
  openai_gpt4o_mini_output: 0.6,
  // OpenAI o3 (per million tokens)
  openai_o3_input: 10.0,
  openai_o3_output: 40.0,
  // Google Gemini 2.5 Pro (per million tokens, ≤200k context)
  google_gemini25_pro_input: 1.25,
  google_gemini25_pro_output: 10.0,
  // Google Gemini 2.5 Flash (per million tokens)
  google_gemini25_flash_input: 0.15,
  google_gemini25_flash_output: 0.6,
  // Google Gemini 2.0 Flash (per million tokens)
  google_gemini20_flash_input: 0.1,
  google_gemini20_flash_output: 0.4,
  // Exa -- $7 per 1,000 searches (text + highlights for 10 results included)
  exa_search: 0.007,
  // Apify -- pay-per-result pricing (~20 posts per profile scrape)
  apify_linkedin: 0.05,
  // Apify tweet scraper -- $0.40/1k tweets, ~$0.04 for 100 tweets
  apify_twitter: 0.04,
  // Browserbase Fetch API with proxies -- $4 per 1,000 requests
  browserbase_fetch: 0.004,
  // Browserbase browser session -- billed by time, $0.10/hr
  browserbase_session_per_hr: 0.1,
  // Google Places API (New) -- Text Search with reviews field mask
  google_places_search: 0.032,
  // AgentMail -- usage-based pricing, ~$0.40 per 1,000 emails
  agentmail_email: 0.0004,
} as const;

// ── Action context (AsyncLocalStorage) ───────────────────────────────────
// Route handlers wrap their work in `withAction()`. Every `trackUsage` call
// inside automatically inherits the action_id + label -- no signature changes
// needed on any service.

interface ActionContext {
  action_id: string;
  action_label: string;
}

const actionStore = new AsyncLocalStorage<ActionContext>();

/**
 * Run `fn` inside an action context. All `trackUsage` calls made during `fn`
 * (including from nested service calls) will be tagged with this action.
 *
 * Usage:
 *   return withAction("Enrich person: John Smith", async () => { ... });
 */
export function withAction<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return actionStore.run(
    { action_id: crypto.randomUUID(), action_label: label },
    fn,
  );
}

export type ServiceName =
  | "claude"
  | "openai"
  | "exa"
  | "apify"
  | "browserbase"
  | "google"
  | "agentmail"
  | "ollama";

interface UsageEntry {
  service: ServiceName;
  operation: string;
  tokens_input?: number;
  tokens_output?: number;
  estimated_cost_usd: number;
  metadata?: Record<string, unknown>;
  campaign_id?: string;
  user_id?: string;
}

export type ClaudeModel = "sonnet" | "haiku" | "opus";

export interface ClaudeCostParams {
  model: ClaudeModel;
  /** Total input tokens (AI SDK's `usage.inputTokens`, already includes cache reads + writes). */
  inputTokens: number;
  outputTokens: number;
  /** Tokens read from the prompt cache, billed at 10% of uncached input. */
  cacheReadTokens?: number;
  /** Tokens written to the prompt cache, billed at 125% of uncached input. */
  cacheCreationTokens?: number;
}

/**
 * Estimate Claude API cost from token counts with cache-aware pricing.
 * `inputTokens` is the total (cache reads + cache writes + uncached); we subtract
 * the cache buckets to get the uncached remainder, then bill each at its own rate.
 */
export function estimateClaudeCost(params: ClaudeCostParams): number {
  const { model } = params;
  const uncachedRate =
    model === "opus"
      ? PRICING.claude_opus_input
      : model === "sonnet"
      ? PRICING.claude_sonnet_input
      : PRICING.claude_haiku_input;
  const cacheReadRate =
    model === "opus"
      ? PRICING.claude_opus_cache_read
      : model === "sonnet"
      ? PRICING.claude_sonnet_cache_read
      : PRICING.claude_haiku_cache_read;
  const cacheWriteRate =
    model === "opus"
      ? PRICING.claude_opus_cache_write
      : model === "sonnet"
      ? PRICING.claude_sonnet_cache_write
      : PRICING.claude_haiku_cache_write;
  const outputRate =
    model === "opus"
      ? PRICING.claude_opus_output
      : model === "sonnet"
      ? PRICING.claude_sonnet_output
      : PRICING.claude_haiku_output;

  const cacheRead = params.cacheReadTokens ?? 0;
  const cacheWrite = params.cacheCreationTokens ?? 0;
  const uncached = Math.max(0, params.inputTokens - cacheRead - cacheWrite);

  return (
    (uncached / 1_000_000) * uncachedRate +
    (cacheRead / 1_000_000) * cacheReadRate +
    (cacheWrite / 1_000_000) * cacheWriteRate +
    (params.outputTokens / 1_000_000) * outputRate
  );
}

interface AiSdkUsageLike {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  cachedInputTokens?: number;
}

/**
 * Convenience wrapper: pulls cache breakdown from AI SDK's `usage` object so
 * call sites don't have to reach into `providerMetadata.anthropic` manually.
 */
export function estimateClaudeCostFromUsage(
  model: ClaudeModel,
  usage: AiSdkUsageLike,
): number {
  return estimateClaudeCost({
    model,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    cacheReadTokens:
      usage.inputTokenDetails?.cacheReadTokens ?? usage.cachedInputTokens,
    cacheCreationTokens: usage.inputTokenDetails?.cacheWriteTokens,
  });
}

/** Maps a gateway provider id to a ServiceName for the usage log. */
export function providerToServiceName(provider: string): ServiceName {
  switch (provider) {
    case "anthropic": return "claude";
    case "openai":    return "openai";
    case "google":    return "google";
    case "ollama":    return "ollama";
    default:
      console.warn(`[cost-tracker] unknown provider "${provider}", logging as "claude"`);
      return "claude";
  }
}

/**
 * Provider-aware cost estimator. Pass the provider id and modelId from
 * getModelInfo(tier) to get the right pricing regardless of which backend is
 * configured. Returns 0 for local providers (ollama) and unknown providers
 * (with a warning so silent wrong numbers never reach the dashboard).
 */
export function estimateCostFromUsage(
  provider: string,
  modelId: string,
  usage: AiSdkUsageLike,
): number {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? usage.cachedInputTokens ?? 0;
  const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens ?? 0;

  switch (provider) {
    case "anthropic": {
      const model: ClaudeModel = modelId.includes("haiku")
        ? "haiku"
        : modelId.includes("opus")
        ? "opus"
        : "sonnet";
      return estimateClaudeCost({ model, inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, cacheCreationTokens: cacheWrite });
    }
    case "openai": {
      if (modelId.startsWith("o3") || modelId.startsWith("o4")) {
        return ((input / 1_000_000) * PRICING.openai_o3_input) + ((output / 1_000_000) * PRICING.openai_o3_output);
      }
      if (modelId.includes("mini")) {
        return ((input / 1_000_000) * PRICING.openai_gpt4o_mini_input) + ((output / 1_000_000) * PRICING.openai_gpt4o_mini_output);
      }
      return ((input / 1_000_000) * PRICING.openai_gpt4o_input) + ((output / 1_000_000) * PRICING.openai_gpt4o_output);
    }
    case "google": {
      if (modelId.includes("2.5-pro") || modelId.includes("2-5-pro")) {
        return ((input / 1_000_000) * PRICING.google_gemini25_pro_input) + ((output / 1_000_000) * PRICING.google_gemini25_pro_output);
      }
      if (modelId.includes("2.5-flash") || modelId.includes("2-5-flash")) {
        return ((input / 1_000_000) * PRICING.google_gemini25_flash_input) + ((output / 1_000_000) * PRICING.google_gemini25_flash_output);
      }
      return ((input / 1_000_000) * PRICING.google_gemini20_flash_input) + ((output / 1_000_000) * PRICING.google_gemini20_flash_output);
    }
    case "ollama":
      return 0;
    default:
      console.warn(`[cost-tracker] estimateCostFromUsage: unknown provider "${provider}", returning 0`);
      return 0;
  }
}

/**
 * Log an API usage entry. Fire-and-forget -- errors are swallowed so callers
 * are never disrupted by tracking failures.
 *
 * Automatically picks up action_id/action_label from the nearest `withAction`
 * context if one exists.
 */
export function trackUsage(entry: UsageEntry): void {
  const ctx = actionStore.getStore();

  void (async () => {
    try {
      const { error } = await getAdminClient()
        .from("api_usage")
        .insert({
          service: entry.service,
          operation: entry.operation,
          tokens_input: entry.tokens_input ?? null,
          tokens_output: entry.tokens_output ?? null,
          estimated_cost_usd: entry.estimated_cost_usd,
          metadata: entry.metadata ?? {},
          campaign_id: entry.campaign_id ?? null,
          user_id: entry.user_id ?? null,
          action_id: ctx?.action_id ?? null,
          action_label: ctx?.action_label ?? null,
        });
      if (error) console.error("[cost-tracker] insert failed:", error.message);
    } catch (err) {
      console.error("[cost-tracker] unexpected error:", err);
    }
  })();
}
