import { readFileSync } from "node:fs";
import { basename } from "node:path";

import type { Command } from "commander";

import { type ConfigEnv, resolveConfig } from "../core/config.js";
import {
  type FetchLike,
  TwitterApiClient,
  TwitterApiError,
} from "../http/client.js";
import { applyFieldSelection } from "../output/filtering.js";
import { renderError, renderOutput } from "../output/render.js";

export interface CommandDependencies {
  env?: ConfigEnv;
  fetch?: FetchLike;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
}

export interface GlobalOptions {
  json?: boolean;
  jsonl?: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: string;
  proxy?: string;
  loginCookies?: string;
}

export type OutputPreset = "userInfo" | "tweet";

export interface PaginationEnvelope<T> {
  items: T[];
  itemKey: string;
  hasNextPage: boolean | undefined;
  nextCursor: string | undefined;
}

export interface ExecutionContext {
  client: TwitterApiClient;
  config: ReturnType<typeof resolveConfig>;
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export function createExecutionContext(
  commandInstance: Command,
  deps: CommandDependencies,
): ExecutionContext | null {
  const stdout = deps.stdout ?? process.stdout;
  const stderr = deps.stderr ?? process.stderr;
  const globals = commandInstance.optsWithGlobals<GlobalOptions>();
  const config = resolveConfig(
    {
      ...(globals.apiKey ? { apiKey: globals.apiKey } : {}),
      ...(globals.baseUrl ? { baseUrl: globals.baseUrl } : {}),
      ...(globals.timeout ? { timeoutMs: Number(globals.timeout) } : {}),
      ...(globals.proxy ? { proxy: globals.proxy } : {}),
      ...(globals.loginCookies ? { loginCookies: globals.loginCookies } : {}),
      output: globals.jsonl ? "jsonl" : "json",
    },
    deps.env,
  );

  if (!config.apiKey) {
    stderr.write(
      renderError({
        type: "configuration_error",
        message: "Missing API key. Set TWITTERAPI_KEY or pass --api-key.",
      }),
    );
    process.exitCode = 1;
    return null;
  }

  return {
    client: new TwitterApiClient(config, deps.fetch),
    config,
    stdout,
    stderr,
  };
}

export function requireLoginCookies(context: ExecutionContext): string | null {
  if (context.config.loginCookies) {
    return context.config.loginCookies;
  }

  context.stderr.write(
    renderError({
      type: "configuration_error",
      message:
        "Missing login cookies. Set TWITTERAPI_LOGIN_COOKIES or pass --login-cookies.",
    }),
  );
  process.exitCode = 1;
  return null;
}

export function requireProxy(
  context: ExecutionContext,
  override?: string,
): string | null {
  const proxy = override ?? context.config.proxy;
  if (proxy) {
    return proxy;
  }

  context.stderr.write(
    renderError({
      type: "configuration_error",
      message: "Missing proxy. Set TWITTERAPI_PROXY or pass --proxy.",
    }),
  );
  process.exitCode = 1;
  return null;
}

export function handleCommandError(
  error: unknown,
  stderr: Pick<NodeJS.WriteStream, "write">,
): void {
  if (error instanceof TwitterApiError) {
    stderr.write(
      renderError({
        type: "api_error",
        message: error.message,
        status_code: error.statusCode,
        details: error.details,
      }),
    );
    process.exitCode = 1;
    return;
  }

  throw error;
}

export function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseLimit(
  raw: string | undefined,
  fallback = 20,
  max = 100,
): number {
  const parsed = Number(raw ?? String(fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function writeResult(context: ExecutionContext, data: unknown): void {
  context.stdout.write(renderOutput(data, context.config.output));
}

export function selectRecord(
  value: Record<string, unknown>,
  compact: boolean,
  preset: OutputPreset,
  fields?: string,
): Record<string, unknown> {
  return applyFieldSelection(value, {
    compact,
    preset,
    ...(fields ? { fields: splitCsv(fields) } : {}),
  });
}

export function selectEnvelope(
  envelope: PaginationEnvelope<Record<string, unknown>>,
  compact: boolean,
  preset: OutputPreset,
  fields?: string,
): Record<string, unknown> {
  const items = envelope.items.map((item) =>
    selectRecord(item, compact, preset, fields),
  );

  return {
    [envelope.itemKey]: items,
    count: items.length,
    has_next_page: envelope.hasNextPage ?? false,
    next_cursor: envelope.nextCursor ?? "",
  };
}

export function appendProxy(
  payload: Record<string, unknown>,
  proxy: string,
): Record<string, unknown> {
  return {
    ...payload,
    proxy,
  };
}

export function withLoginCookies(
  payload: Record<string, unknown>,
  loginCookies: string,
): Record<string, unknown> {
  return {
    login_cookies: loginCookies,
    ...payload,
  };
}

export function fileToUploadPart(path: string): {
  blob: Blob;
  filename: string;
} {
  return {
    blob: new Blob([readFileSync(path)]),
    filename: basename(path),
  };
}
