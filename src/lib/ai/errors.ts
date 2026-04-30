export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly fix?: string,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIConfigError extends AIServiceError {
  constructor(message: string, fix?: string) {
    super(message, fix);
    this.name = 'AIConfigError';
  }
}

export class AITransientError extends AIServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'AITransientError';
  }
}

export function normalizeAIError(err: unknown, context: string): AIServiceError {
  if (err instanceof AIServiceError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('401') || msg.toLowerCase().includes('api key') || msg.includes('Unauthorized')) {
    return new AIConfigError(`[${context}] Auth failed: ${msg}`);
  }
  if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('timeout')) {
    return new AITransientError(`[${context}] Transient error: ${msg}`);
  }
  return new AIServiceError(`[${context}] ${msg}`);
}
