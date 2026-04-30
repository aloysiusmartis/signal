import { describe, expect, it } from "vitest";
import {
  estimateCostFromUsage,
  providerToServiceName,
  PRICING,
} from "@/lib/services/cost-tracker";

const makeUsage = (
  inputTokens: number,
  outputTokens: number,
  opts?: { cacheReadTokens?: number; cacheWriteTokens?: number },
) => ({
  inputTokens,
  outputTokens,
  inputTokenDetails: {
    cacheReadTokens: opts?.cacheReadTokens ?? 0,
    cacheWriteTokens: opts?.cacheWriteTokens ?? 0,
  },
});

describe("estimateCostFromUsage — anthropic", () => {
  it("haiku: uncached input + output", () => {
    const usage = makeUsage(1_000_000, 1_000_000);
    const cost = estimateCostFromUsage("anthropic", "claude-haiku-4-5-20251001", usage);
    expect(cost).toBeCloseTo(
      PRICING.claude_haiku_input + PRICING.claude_haiku_output,
      6,
    );
  });

  it("sonnet: cache read is cheaper than uncached", () => {
    const uncached = estimateCostFromUsage("anthropic", "claude-sonnet-4-6", makeUsage(1_000_000, 0));
    const cached   = estimateCostFromUsage("anthropic", "claude-sonnet-4-6", makeUsage(1_000_000, 0, { cacheReadTokens: 1_000_000 }));
    expect(cached).toBeLessThan(uncached);
    expect(cached).toBeCloseTo(PRICING.claude_sonnet_cache_read, 6);
  });

  it("opus: cache write is more expensive than uncached", () => {
    const uncached = estimateCostFromUsage("anthropic", "claude-opus-4-6", makeUsage(1_000_000, 0));
    const written  = estimateCostFromUsage("anthropic", "claude-opus-4-6", makeUsage(1_000_000, 0, { cacheWriteTokens: 1_000_000 }));
    expect(written).toBeGreaterThan(uncached);
  });
});

describe("estimateCostFromUsage — openai", () => {
  it("gpt-4o: correct rates", () => {
    const cost = estimateCostFromUsage("openai", "gpt-4o", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.openai_gpt4o_input + PRICING.openai_gpt4o_output,
      6,
    );
  });

  it("gpt-4o-mini: correct rates", () => {
    const cost = estimateCostFromUsage("openai", "gpt-4o-mini", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.openai_gpt4o_mini_input + PRICING.openai_gpt4o_mini_output,
      6,
    );
  });

  it("o3: uses reasoning model rates", () => {
    const cost = estimateCostFromUsage("openai", "o3-2025-04-16", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.openai_o3_input + PRICING.openai_o3_output,
      6,
    );
  });
});

describe("estimateCostFromUsage — google", () => {
  it("gemini-2.5-pro: correct rates", () => {
    const cost = estimateCostFromUsage("google", "gemini-2.5-pro-preview", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.google_gemini25_pro_input + PRICING.google_gemini25_pro_output,
      6,
    );
  });

  it("gemini-2.5-flash: correct rates", () => {
    const cost = estimateCostFromUsage("google", "gemini-2.5-flash-preview-05-20", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.google_gemini25_flash_input + PRICING.google_gemini25_flash_output,
      6,
    );
  });

  it("gemini-2.0-flash: falls back to 2.0 rates", () => {
    const cost = estimateCostFromUsage("google", "gemini-2.0-flash", makeUsage(1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(
      PRICING.google_gemini20_flash_input + PRICING.google_gemini20_flash_output,
      6,
    );
  });
});

describe("estimateCostFromUsage — ollama / unknown", () => {
  it("ollama returns 0", () => {
    expect(estimateCostFromUsage("ollama", "llama3.3", makeUsage(100_000, 50_000))).toBe(0);
  });
});

describe("providerToServiceName", () => {
  it("maps anthropic → claude", () => expect(providerToServiceName("anthropic")).toBe("claude"));
  it("maps openai → openai",     () => expect(providerToServiceName("openai")).toBe("openai"));
  it("maps google → google",     () => expect(providerToServiceName("google")).toBe("google"));
  it("maps ollama → ollama",     () => expect(providerToServiceName("ollama")).toBe("ollama"));
});
