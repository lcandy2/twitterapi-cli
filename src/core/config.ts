export type OutputMode = "json" | "jsonl";

export interface ConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  output?: OutputMode;
}

export interface ResolvedConfig {
  apiKey?: string;
  baseUrl: string;
  timeoutMs: number;
  output: OutputMode;
}

export interface ConfigEnv {
  TWITTERAPI_KEY?: string;
  TWITTERAPI_BASE_URL?: string;
  TWITTERAPI_TIMEOUT_MS?: string;
}

const DEFAULT_BASE_URL = "https://api.twitterapi.io";
const DEFAULT_TIMEOUT_MS = 30_000;

export function resolveConfig(
  overrides: ConfigOverrides,
  env: ConfigEnv = process.env,
): ResolvedConfig {
  const apiKey = overrides.apiKey ?? env.TWITTERAPI_KEY;

  return {
    ...(apiKey ? { apiKey } : {}),
    baseUrl: overrides.baseUrl ?? env.TWITTERAPI_BASE_URL ?? DEFAULT_BASE_URL,
    timeoutMs: overrides.timeoutMs ?? parseTimeout(env.TWITTERAPI_TIMEOUT_MS),
    output: overrides.output ?? "json",
  };
}

function parseTimeout(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
