import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli.js";
import { loadConfigFile, resolveConfig } from "../../src/core/config.js";
import { type FetchLike, TwitterApiClient } from "../../src/http/client.js";
import { applyFieldSelection } from "../../src/output/filtering.js";

function readHeader(init: RequestInit | undefined, key: string): string | null {
  if (!init?.headers) {
    return null;
  }

  return new Headers(init.headers).get(key);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createProgram", () => {
  it("shows full top-level command groups", () => {
    const program = createProgram();

    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toEqual([
      "user",
      "tweet",
      "list",
      "community",
      "trend",
      "space",
      "my",
      "auth",
      "dm",
      "media",
      "profile",
      "webhook",
      "stream",
    ]);
  });

  it("supports stable json output option on root command", () => {
    const program = createProgram();
    program.exitOverride();

    program.parse(["node", "twitterapi", "--json", "user", "info", "jack"]);

    expect(program.opts()).toMatchObject({ json: true });
  });

  it("renders compact user info from the live command handler", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        status: "success",
        data: {
          id: "12",
          userName: "jack",
          name: "Jack",
          description: "founder",
          followers: 100,
          following: 20,
          profilePicture: "https://example.com/avatar.jpg",
          extra: "ignored",
        },
      }),
    );

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "user",
      "info",
      "jack",
      "--compact",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          id: "12",
          userName: "jack",
          name: "Jack",
          description: "founder",
          followers: 100,
          following: 20,
          profilePicture: "https://example.com/avatar.jpg",
        },
        null,
        2,
      )}\n`,
    );
  });

  it("renders user followers with pagination metadata", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        users: [
          { id: "1", userName: "alpha", name: "Alpha", followers: 10 },
          { id: "2", userName: "beta", name: "Beta", followers: 20 },
        ],
        has_next_page: true,
        next_cursor: "next-1",
      }),
    );

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "user",
      "followers",
      "jack",
      "--page-size",
      "50",
      "--cursor",
      "cursor-1",
      "--compact",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/twitter/user/followers?userName=jack&cursor=cursor-1&pageSize=50",
    );
    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          users: [
            { id: "1", userName: "alpha", name: "Alpha", followers: 10 },
            { id: "2", userName: "beta", name: "Beta", followers: 20 },
          ],
          count: 2,
          has_next_page: true,
          next_cursor: "next-1",
        },
        null,
        2,
      )}\n`,
    );
  });

  it("renders compact tweet search results with pagination metadata", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        tweets: [
          {
            id: "s1",
            text: "match one",
            createdAt: "now",
            retweetCount: 1,
            extra: true,
          },
          {
            id: "s2",
            text: "match two",
            createdAt: "later",
            retweetCount: 2,
          },
        ],
        has_next_page: true,
        next_cursor: "cursor-next",
      }),
    );

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "tweet",
      "search",
      "openai",
      "--limit",
      "1",
      "--compact",
      "--cursor",
      "cursor-1",
      "--query-type",
      "Top",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          tweets: [
            {
              id: "s1",
              text: "match one",
              createdAt: "now",
              retweetCount: 1,
            },
          ],
          count: 1,
          has_next_page: true,
          next_cursor: "cursor-next",
        },
        null,
        2,
      )}\n`,
    );
  });

  it("posts login credentials to auth login", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ login_cookie: "cookie-value" }));

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "auth",
      "login",
      "--user-name",
      "citron",
      "--email",
      "citron@example.com",
      "--password",
      "secret",
      "--proxy",
      "http://proxy.local",
      "--totp-secret",
      "totp",
    ]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        user_name: "citron",
        email: "citron@example.com",
        password: "secret",
        proxy: "http://proxy.local",
        totp_secret: "totp",
      }),
    );
    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify({ login_cookie: "cookie-value" }, null, 2)}\n`,
    );
  });

  it("posts tweet creation body with login cookies and media ids", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ ok: true, tweet_id: "tweet-1" }));

    const program = createProgram({
      fetch: fetchMock,
      env: {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_LOGIN_COOKIES: "cookie-string",
        TWITTERAPI_PROXY: "http://proxy.local",
      },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "tweet",
      "create",
      "hello world",
      "--reply-to-tweet-id",
      "123",
      "--media-ids",
      "m1,m2",
      "--community-id",
      "c1",
      "--note-tweet",
    ]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/twitter/create_tweet_v2",
    );
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      login_cookies: "cookie-string",
      tweet_text: "hello world",
      proxy: "http://proxy.local",
      reply_to_tweet_id: "123",
      media_ids: ["m1", "m2"],
      community_id: "c1",
      is_note_tweet: true,
    });
  });

  it("sends a delete request body for webhook rule deletion", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ ok: true }));

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "webhook",
      "delete-rule",
      "rule-1",
    ]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/oapi/tweet_filter/delete_rule",
    );
    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBe(JSON.stringify({ rule_id: "rule-1" }));
  });

  it("uploads multipart media data", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "twitterapi-cli-media-"));
    const mediaPath = join(tempDir, "hello.txt");
    writeFileSync(mediaPath, "hello media", "utf8");

    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ media_id: "media-1" }));

    const program = createProgram({
      fetch: fetchMock,
      env: {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_LOGIN_COOKIES: "cookie-string",
        TWITTERAPI_PROXY: "http://proxy.local",
      },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "media",
      "upload",
      mediaPath,
      "--long-video",
    ]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(readHeader(init, "x-api-key")).toBe("env-key");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(form.get("login_cookies")).toBe("cookie-string");
    expect(form.get("proxy")).toBe("http://proxy.local");
    expect(form.get("is_long_video")).toBe("true");
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("patches avatar with multipart payload", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "twitterapi-cli-avatar-"));
    const filePath = join(tempDir, "avatar.png");
    writeFileSync(filePath, "avatar bytes", "utf8");

    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ ok: true }));
    const program = createProgram({
      fetch: fetchMock,
      env: {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_LOGIN_COOKIES: "cookie-string",
        TWITTERAPI_PROXY: "http://proxy.local",
      },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "profile",
      "update-avatar",
      filePath,
    ]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(form.get("login_cookies")).toBe("cookie-string");
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("posts stream monitor requests", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ ok: true }));
    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "stream",
      "add-user",
      "elonmusk",
    ]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/oapi/x_user_stream/add_user_to_monitor_tweet",
    );
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ x_user_name: "elonmusk" }));
  });
});

describe("loadConfigFile", () => {
  it("reads ~/.twitterapi/config.json when present", () => {
    const tempHome = mkdtempSync(join(tmpdir(), "twitterapi-cli-config-"));
    const configDir = join(tempHome, ".twitterapi");
    const configPath = join(configDir, "config.json");

    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        api_key: "file-key",
        base_url: "https://example.com",
        timeout: 42,
        proxy: "http://proxy.local",
        login_cookies: "cookie-from-file",
      }),
      { encoding: "utf8", flag: "w" },
    );

    expect(loadConfigFile({ homeDir: tempHome })).toEqual({
      apiKey: "file-key",
      baseUrl: "https://example.com",
      timeoutMs: 42_000,
      proxy: "http://proxy.local",
      loginCookies: "cookie-from-file",
    });
  });

  it("returns empty config when file is missing", () => {
    const tempHome = mkdtempSync(join(tmpdir(), "twitterapi-cli-missing-"));

    expect(loadConfigFile({ homeDir: tempHome })).toEqual({});
  });
});

describe("resolveConfig", () => {
  it("defaults to public api url and timeout", () => {
    const config = resolveConfig({});

    expect(config.baseUrl).toBe("https://api.twitterapi.io");
    expect(config.timeoutMs).toBe(30_000);
    expect(config.output).toBe("json");
  });

  it("prefers explicit values over env and file defaults", () => {
    const config = resolveConfig(
      {
        apiKey: "cli-key",
        output: "jsonl",
        loginCookies: "cli-cookie",
      },
      {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_BASE_URL: "https://env.example.com",
        TWITTERAPI_TIMEOUT_MS: "15000",
        TWITTERAPI_PROXY: "http://env.proxy",
        TWITTERAPI_LOGIN_COOKIES: "env-cookie",
      },
      {
        apiKey: "file-key",
        baseUrl: "https://file.example.com",
        timeoutMs: 60_000,
        proxy: "http://file.proxy",
        loginCookies: "file-cookie",
      },
    );

    expect(config.apiKey).toBe("cli-key");
    expect(config.baseUrl).toBe("https://env.example.com");
    expect(config.timeoutMs).toBe(15_000);
    expect(config.output).toBe("jsonl");
    expect(config.proxy).toBe("http://env.proxy");
    expect(config.loginCookies).toBe("cli-cookie");
  });
});

describe("applyFieldSelection", () => {
  it("returns compact user info fields", () => {
    const result = applyFieldSelection(
      {
        id: "1",
        userName: "jack",
        name: "Jack",
        description: "bio",
        followers: 10,
        following: 5,
        profilePicture: "https://example.com/avatar.jpg",
        extra: true,
      },
      { compact: true, preset: "userInfo" },
    );

    expect(result).toEqual({
      id: "1",
      userName: "jack",
      name: "Jack",
      description: "bio",
      followers: 10,
      following: 5,
      profilePicture: "https://example.com/avatar.jpg",
    });
  });

  it("returns compact tweet fields", () => {
    const result = applyFieldSelection(
      {
        id: "t1",
        text: "hello",
        createdAt: "now",
        likeCount: 1,
        extra: true,
      },
      { compact: true, preset: "tweet" },
    );

    expect(result).toEqual({
      id: "t1",
      text: "hello",
      createdAt: "now",
      likeCount: 1,
    });
  });

  it("returns explicitly selected fields", () => {
    const result = applyFieldSelection(
      {
        id: "1",
        userName: "jack",
        name: "Jack",
      },
      { fields: ["id", "name"] },
    );

    expect(result).toEqual({
      id: "1",
      name: "Jack",
    });
  });
});

describe("TwitterApiClient", () => {
  it("sends x-api-key and query params to the configured endpoint", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        jsonResponse({ status: "success", data: { id: "1" } }),
      );

    const client = new TwitterApiClient(
      {
        apiKey: "secret-key",
        baseUrl: "https://api.twitterapi.io",
        timeoutMs: 5_000,
        output: "json",
      },
      fetchMock,
    );

    await client.getJson("/twitter/user/info", { userName: "jack" });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("expected fetch to be called");
    }

    const [url, init] = firstCall;
    expect(String(url)).toBe(
      "https://api.twitterapi.io/twitter/user/info?userName=jack",
    );
    expect(readHeader(init, "x-api-key")).toBe("secret-key");
  });

  it("posts json request bodies", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ ok: true }));

    const client = new TwitterApiClient(
      {
        apiKey: "secret-key",
        baseUrl: "https://api.twitterapi.io",
        timeoutMs: 5_000,
        output: "json",
      },
      fetchMock,
    );

    await client.postJson("/twitter/like_tweet_v2", { tweet_id: "1" });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ tweet_id: "1" }));
    expect(readHeader(init, "content-type")).toBe("application/json");
    expect(readHeader(init, "x-api-key")).toBe("secret-key");
  });

  it("throws a typed error when the API responds with an error status", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        jsonResponse({ status: "error", msg: "User not found" }, 404),
      );

    const client = new TwitterApiClient(
      {
        apiKey: "secret-key",
        baseUrl: "https://api.twitterapi.io",
        timeoutMs: 5_000,
        output: "json",
      },
      fetchMock,
    );

    await expect(
      client.getJson("/twitter/user/info", { userName: "missing" }),
    ).rejects.toMatchObject({
      name: "TwitterApiError",
      statusCode: 404,
      message: "User not found",
    });
  });
});
