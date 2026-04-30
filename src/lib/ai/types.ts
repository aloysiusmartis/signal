export type TouchpointTier = 'fast' | 'standard' | 'power';

export type Implementation =
  | 'native-anthropic'
  | 'native-openai'
  | 'native-google'
  | 'openai-compatible';

export interface TierConfig {
  models: string[];
  default: string;
}

export interface Recipe {
  id: string;
  name: string;
  tier: 'native' | 'openai-compat';
  implementation: Implementation;
  base_url_default?: string;
  auth_env?: {
    required: string[];
    setup_url?: string;
  };
  touchpoints: {
    fast?: TierConfig;
    standard?: TierConfig;
    power?: TierConfig;
  };
  setup_hint?: string;
}

export interface AIGatewayConfig {
  fast_model: string;
  standard_model: string;
  power_model: string;
  base_urls: Record<string, string>;
  env: Record<string, string | undefined>;
}

export interface ParsedModelId {
  providerId: string;
  modelId: string;
}
