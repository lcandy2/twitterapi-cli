import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type OutputMode = "json" | "jsonl";

export interface ConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  output?: OutputMode;
}

export interface FileConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
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

export interface LoadConfigFileOptions {
  homeDir?: string;
}

interface RawConfigFile {
  api_key?: string;
  base_url?: string;
  timeout?: number;
}

const DEFAULT_BASE_URL = "https://api.twitterapi.io";
const DEFAULT_TIMEOUT_MS = 30_000;

export function loadConfigFile(
  options: LoadConfigFileOptions = {},
): FileConfig {
  const configPath = join(
    options.homeDir ?? homedir(),
    ".twitterapi",
    "config.json",
  );

  if (!existsSync(configPath)) {
    return {};
  }

  const raw = JSON.parse(readFileSync(configPath, "utf8")) as RawConfigFile;

  return {
    ...(raw.api_key ? { apiKey: raw.api_key } : {}),
    ...(raw.base_url ? { baseUrl: raw.base_url } : {}),
    ...(typeof raw.timeout === "number" && raw.timeout > 0
      ? { timeoutMs: raw.timeout * 1000 }
      : {}),
  };
}

export function resolveConfig(
  overrides: ConfigOverrides,
  env: ConfigEnv = process.env,
  fileConfig: FileConfig = loadConfigFile(),
): ResolvedConfig {
  const apiKey = overrides.apiKey ?? env.TWITTERAPI_KEY ?? fileConfig.apiKey;

  return {
    ...(apiKey ? { apiKey } : {}),
    baseUrl:
      overrides.baseUrl ??
      env.TWITTERAPI_BASE_URL ??
      fileConfig.baseUrl ??
      DEFAULT_BASE_URL,
    timeoutMs:
      overrides.timeoutMs ??
      parseTimeout(env.TWITTERAPI_TIMEOUT_MS) ??
      fileConfig.timeoutMs ??
      DEFAULT_TIMEOUT_MS,
    output: overrides.output ?? "json",
  };
}

function parseTimeout(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
