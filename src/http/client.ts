import type { ResolvedConfig } from "../core/config.js";

export type FetchLike = typeof fetch;

type Primitive = string | number | boolean;

interface ErrorResponseBody {
  msg?: string;
  message?: string;
  error?: string | boolean | number;
  status?: string;
}

interface RequestOptions {
  query?: Record<string, Primitive | undefined>;
  body?: unknown;
  formData?: FormData;
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
    query: Record<string, Primitive | undefined> = {},
  ): Promise<T> {
    return this.requestJson<T>("GET", path, { query });
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>("POST", path, { body });
  }

  async patchJson<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>("PATCH", path, { body });
  }

  async deleteJson<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>("DELETE", path, { body });
  }

  async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.requestJson<T>("POST", path, { formData });
  }

  async patchMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.requestJson<T>("PATCH", path, { formData });
  }

  private async requestJson<T>(
    method: string,
    path: string,
    options: RequestOptions,
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const headers = new Headers({
      "x-api-key": this.config.apiKey ?? "",
    });

    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const text = await response.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new TwitterApiError(
        readErrorMessage(parsed),
        response.status,
        parsed,
      );
    }

    return unwrapData<T>(parsed);
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
