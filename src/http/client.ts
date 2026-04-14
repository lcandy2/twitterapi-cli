import type { ResolvedConfig } from "../core/config.js";

export type FetchLike = typeof fetch;

interface ErrorResponseBody {
  msg?: string;
  message?: string;
  error?: string | boolean | number;
  status?: string;
}

export class TwitterApiError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "TwitterApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class TwitterApiClient {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async getJson<T>(
    path: string,
    query: Record<string, string | number | boolean>,
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: {
        "x-api-key": this.config.apiKey ?? "",
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const text = await response.text();
    const body = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new TwitterApiError(readErrorMessage(body), response.status, body);
    }

    return unwrapData<T>(body);
  }
}

function unwrapData<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }

  return body as T;
}

function readErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "TwitterAPI request failed";
  }

  const errorBody = body as ErrorResponseBody;

  return errorBody.msg ?? errorBody.message ?? "TwitterAPI request failed";
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
