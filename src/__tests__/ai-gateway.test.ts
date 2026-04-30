import { afterEach, describe, expect, it } from 'vitest';
import { AIConfigError } from '@/lib/ai/errors';
import { getModel, isAvailable, _resetGateway } from '@/lib/ai/gateway';

afterEach(() => {
  delete process.env.AI_FAST_MODEL;
  delete process.env.AI_STANDARD_MODEL;
  delete process.env.AI_POWER_MODEL;
  _resetGateway();
});

describe('getModel', () => {
  it('returns a model object for fast tier with Anthropic key set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetGateway();
    const model = getModel('fast');
    expect(model).toBeDefined();
    expect(typeof model).toBe('object');
  });

  it('returns a model object for standard tier', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetGateway();
    expect(getModel('standard')).toBeDefined();
  });

  it('returns a model object for power tier', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetGateway();
    expect(getModel('power')).toBeDefined();
  });

  it('env var AI_FAST_MODEL overrides default', () => {
    process.env.AI_FAST_MODEL = 'openai:gpt-4o-mini';
    process.env.OPENAI_API_KEY = 'sk-test';
    _resetGateway();
    // Should not throw — OpenAI key is present
    expect(getModel('fast')).toBeDefined();
  });

  it('throws AIConfigError when Anthropic key is missing', () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    _resetGateway();
    expect(() => getModel('fast')).toThrow(AIConfigError);
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it('throws with fix hint when key is missing', () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    _resetGateway();
    try {
      getModel('fast');
    } catch (e) {
      expect(e).toBeInstanceOf(AIConfigError);
      expect((e as AIConfigError).fix).toContain('ANTHROPIC_API_KEY');
    }
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it('throws AIConfigError for unknown provider in env var', () => {
    process.env.AI_FAST_MODEL = 'unknown:some-model';
    _resetGateway();
    expect(() => getModel('fast')).toThrow(AIConfigError);
  });

  it('caches model instances across calls', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetGateway();
    const a = getModel('fast');
    const b = getModel('fast');
    expect(a).toBe(b);
  });
});

describe('isAvailable', () => {
  it('returns true when Anthropic key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetGateway();
    expect(isAvailable('fast')).toBe(true);
  });

  it('returns false when Anthropic key is missing', () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    _resetGateway();
    expect(isAvailable('fast')).toBe(false);
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it('returns true for ollama tier (no auth required)', () => {
    process.env.AI_FAST_MODEL = 'ollama:llama3.2';
    _resetGateway();
    expect(isAvailable('fast')).toBe(true);
  });
});
