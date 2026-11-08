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

  it("extracts tweet id from x.com url for tweet get", async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        tweets: [
          { id: "2044505743144194514", text: "hello", createdAt: "now" },
        ],
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
      "get",
      "https://x.com/pbakaus/status/2044505743144194514?s=46",
      "--compact",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/twitter/tweets?tweet_ids=2044505743144194514",
    );
  });

  it("extracts username from x.com url for user info", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ id: "1", userName: "pbakaus" }));

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });

    await program.parseAsync([
      "node",
      "twitterapi",
      "user",
      "info",
      "https://x.com/pbakaus",
      "--compact",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.twitterapi.io/twitter/user/info?userName=pbakaus",
    );
  });

  it("includes AI examples in help output", () => {
    const program = createProgram();
    const help = program.helpInformation();
    expect(help).toContain("Examples:");
    expect(help).toContain("twitterapi tweet get");
    expect(help).toContain("twitterapi user info");
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

describe("endpoint coverage", () => {
  const actionEnv = {
    TWITTERAPI_KEY: "env-key",
    TWITTERAPI_LOGIN_COOKIES: "cookie-string",
    TWITTERAPI_PROXY: "http://proxy.local",
  };

  async function runCli(
    args: string[],
    payload: unknown,
    env: Record<string, string> = { TWITTERAPI_KEY: "env-key" },
  ) {
    const stdout = { write: vi.fn(() => true) };
    const stderr = { write: vi.fn(() => true) };
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse(payload));
    const program = createProgram({ fetch: fetchMock, env, stdout, stderr });

    await program.parseAsync(["node", "twitterapi", ...args]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return {
      fetchMock,
      stderr,
      url: String(url),
      init,
      output: stdout.write.mock.calls.length
        ? JSON.parse(String((stdout.write.mock.calls[0] as unknown[])[0]))
        : undefined,
    };
  }

  it.each([
    ["tweet", "unretweet", "/twitter/unretweet_tweet_v2", "tweet_id"],
    ["tweet", "pin", "/twitter/pin_tweet_v2", "tweet_id"],
    ["tweet", "unpin", "/twitter/unpin_tweet_v2", "tweet_id"],
    ["user", "mute", "/twitter/mute_user_v2", "user_id"],
    ["user", "unmute", "/twitter/unmute_user_v2", "user_id"],
    ["user", "block", "/twitter/block_user_v2", "user_id"],
    ["user", "unblock", "/twitter/unblock_user_v2", "user_id"],
  ])("posts %s %s to %s", async (group, name, path, idField) => {
    const { url, init, output } = await runCli(
      [group, name, "123"],
      { status: "success" },
      actionEnv,
    );

    expect(url).toBe(`https://api.twitterapi.io${path}`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      login_cookies: "cookie-string",
      [idField]: "123",
      proxy: "http://proxy.local",
    });
    expect(output).toEqual({ status: "success" });
  });

  it.each([
    ["tweet", "unretweet"],
    ["user", "block"],
  ])("requires login cookies for %s %s", async (group, name) => {
    const { fetchMock, stderr } = await runCli([group, name, "123"], {});

    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(stderr.write.mock.calls[0])).toContain("Missing login");
    process.exitCode = undefined;
  });

  it("gets follower ids by username with count and cursor", async () => {
    const { url, output } = await runCli(
      ["user", "followers-ids", "@jack", "--count", "50", "--cursor", "c1"],
      {
        ids: ["1", "2"],
        has_next_page: true,
        next_cursor: "c2",
        status: "success",
      },
    );

    expect(url).toBe(
      "https://api.twitterapi.io/twitter/user/followers_ids?userName=jack&count=50&cursor=c1",
    );
    expect(output).toEqual({
      ids: ["1", "2"],
      count: 2,
      has_next_page: true,
      next_cursor: "c2",
    });
  });

  it("gets follower ids by user id", async () => {
    const { url } = await runCli(["user", "followers-ids", "--user-id", "12"], {
      ids: [],
    });

    expect(url).toBe(
      "https://api.twitterapi.io/twitter/user/followers_ids?userId=12",
    );
  });

  it("rejects follower ids without an account", async () => {
    const { fetchMock, stderr } = await runCli(["user", "followers-ids"], {});

    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(stderr.write.mock.calls[0])).toContain("usage_error");
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it("gets compact user subscriptions", async () => {
    const { url, output } = await runCli(
      ["user", "subscriptions", "12", "--cursor", "c1", "--compact"],
      {
        users: [{ id: "1", userName: "alpha", extra: true }],
        has_next_page: false,
        next_cursor: null,
        status: "success",
      },
    );

    expect(url).toBe(
      "https://api.twitterapi.io/twitter/user/subscriptions?userId=12&cursor=c1",
    );
    expect(output).toEqual({
      users: [{ id: "1", userName: "alpha" }],
      count: 1,
      has_next_page: false,
      next_cursor: "",
    });
  });

  it("gets user tweets by id and keeps top-level pagination", async () => {
    const { url, output } = await runCli(
      ["user", "tweets", "--user-id", "12", "--limit", "1", "--fields", "id"],
      {
        status: "success",
        data: { pin_tweet: null, tweets: [{ id: "t1" }, { id: "t2" }] },
        has_next_page: true,
        next_cursor: "next",
      },
    );

    expect(url).toBe(
      "https://api.twitterapi.io/twitter/user/last_tweets?userId=12",
    );
    expect(output).toEqual({
      tweets: [{ id: "t1" }],
      count: 1,
      has_next_page: true,
      next_cursor: "next",
    });
  });

  it("still gets user tweets by username", async () => {
    const { url } = await runCli(["user", "tweets", "jack"], {
      data: { tweets: [] },
    });

    expect(url).toBe(
      "https://api.twitterapi.io/twitter/user/last_tweets?userName=jack",
    );
  });

  it("applies compact output to retweeters", async () => {
    const { output } = await runCli(["tweet", "retweeters", "1", "--compact"], {
      users: [{ id: "1", userName: "alpha", extra: true }],
      has_next_page: true,
      next_cursor: "c2",
    });

    expect(output).toEqual({
      users: [{ id: "1", userName: "alpha" }],
      count: 1,
      has_next_page: true,
      next_cursor: "c2",
    });
  });

  it.each([
    [[], "tweetId=1"],
    [["--include-replies"], "tweetId=1&includeReplies=true"],
    [["--no-include-replies"], "tweetId=1&includeReplies=false"],
  ])("maps quote reply flags %j", async (flags, expectedQuery) => {
    const { url } = await runCli(["tweet", "quotes", "1", ...flags], {
      tweets: [],
    });

    expect(url).toBe(
      `https://api.twitterapi.io/twitter/tweet/quotes?${expectedQuery}`,
    );
  });

  it.each([
    [["--limit", "5"], 5],
    [["--limit", "5", "--count", "40"], 40],
  ])("sends the bookmark page size for %j", async (flags, count) => {
    const { init } = await runCli(
      ["tweet", "bookmarks", ...flags],
      { tweets: [] },
      actionEnv,
    );

    expect(JSON.parse(String(init?.body)).count).toBe(count);
  });

  it.each([
    ["list", "members", "members"],
    ["list", "followers", "followers"],
    ["community", "members", "members"],
    ["community", "moderators", "moderators"],
  ])("reads %s %s from the %s key", async (group, name, key) => {
    const { output } = await runCli([group, name, "1", "--fields", "id"], {
      [key]: [{ id: "u1", extra: true }],
      has_next_page: true,
      next_cursor: "c2",
    });

    expect(output).toEqual({
      users: [{ id: "u1" }],
      count: 1,
      has_next_page: true,
      next_cursor: "c2",
    });
  });

  it("maps community member fields in compact output", async () => {
    const { output } = await runCli(
      ["community", "moderators", "1", "--compact"],
      {
        moderators: [
          {
            id: "u1",
            name: "Alpha",
            screen_name: "alpha",
            description: "bio",
            followers_count: 10,
            following_count: 2,
            profile_image_url_https: "https://example.com/a.jpg",
            email: "ignored",
          },
        ],
      },
    );

    expect(output.users).toEqual([
      {
        id: "u1",
        userName: "alpha",
        name: "Alpha",
        description: "bio",
        followers: 10,
        following: 2,
        profilePicture: "https://example.com/a.jpg",
      },
    ]);
  });

  it.each([[["--media-id", "m1"]], [["--media-ids", "m1"]]])(
    "sends a single media id for dm flags %j",
    async (flags) => {
      const { init } = await runCli(
        ["dm", "send", "12", "hello", ...flags],
        { status: "success" },
        actionEnv,
      );

      expect(JSON.parse(String(init?.body))).toEqual({
        login_cookies: "cookie-string",
        user_id: "12",
        text: "hello",
        proxy: "http://proxy.local",
        media_id: "m1",
      });
    },
  );

  it("rejects several media ids on a dm", async () => {
    const { fetchMock, stderr } = await runCli(
      ["dm", "send", "12", "hello", "--media-ids", "m1,m2"],
      {},
      actionEnv,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(stderr.write.mock.calls[0])).toContain("usage_error");
    process.exitCode = undefined;
  });

  it("leaves array data unchanged when unwrapping", async () => {
    const { output } = await runCli(["stream", "users"], {
      status: "success",
      data: [{ id_for_user: "1" }],
    });

    expect(output).toEqual([{ id_for_user: "1" }]);
  });
});

describe("failures reported with HTTP 200", () => {
  const env = {
    TWITTERAPI_KEY: "env-key",
    TWITTERAPI_LOGIN_COOKIES: "cookie-string",
    TWITTERAPI_PROXY: "http://proxy.local",
  };

  async function runCli(args: string[], payload: unknown) {
    const stdout = { write: vi.fn(() => true) };
    const stderr = { write: vi.fn(() => true) };
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse(payload));
    const program = createProgram({ fetch: fetchMock, env, stdout, stderr });

    await program.parseAsync(["node", "twitterapi", ...args]);

    const exitCode = process.exitCode;
    process.exitCode = undefined;
    return { stdout, stderr, exitCode };
  }

  it.each([
    [["user", "info", "missing"]],
    [["user", "followers", "missing"]],
    [["user", "tweets", "missing"]],
    [["user", "subscriptions", "1"]],
    [["user", "followers-ids", "missing"]],
    [["tweet", "get", "1"]],
    [["tweet", "search", "q"]],
    [["tweet", "bookmarks"]],
    [["tweet", "pin", "1"]],
    [["user", "block", "1"]],
    [["list", "members", "1"]],
    [["community", "moderators", "1"]],
    [["trend", "get", "1"]],
    [["space", "detail", "1"]],
    [["my", "info"]],
    [["dm", "send", "1", "hello"]],
    [["community", "join", "1"]],
    [["profile", "update", "--name", "x"]],
    [["webhook", "get-rules"]],
    [["webhook", "delete-rule", "1"]],
    [["stream", "users"]],
    [["auth", "login", "--user-name", "a", "--email", "b", "--password", "c"]],
  ])("fails %j on status error", async (args) => {
    const { stdout, stderr, exitCode } = await runCli(args, {
      status: "error",
      msg: "user not found",
    });

    expect(stdout.write).not.toHaveBeenCalled();
    expect(exitCode).toBe(1);
    expect(
      JSON.parse(String((stderr.write.mock.calls[0] as unknown[])[0])),
    ).toEqual({
      type: "api_error",
      message: "user not found",
      status_code: 200,
      details: { status: "error", msg: "user not found" },
    });
  });

  it.each([
    [
      { status: "error", message: "not your tweet", x_status: 403, code: 34 },
      "not your tweet",
    ],
    [{ status: "failed", msg: "queue rejected" }, "queue rejected"],
    [{ status: "ERROR", msg: "", message: "from message" }, "from message"],
    [{ status: "error" }, "TwitterAPI request failed"],
  ])("reads the failure message from %j", async (payload, message) => {
    const { stderr, exitCode } = await runCli(["tweet", "pin", "1"], payload);

    expect(exitCode).toBe(1);
    expect(
      JSON.parse(String((stderr.write.mock.calls[0] as unknown[])[0])).message,
    ).toBe(message);
  });

  it.each([
    [{ status: "success", tweet_id: "1" }],
    [{ status: "", tweet_id: "1" }],
    [{ status: "ok", tweet_id: "1" }],
    [{ status: "pending", tweet_id: "1" }],
    [{ status: 0, tweet_id: "1" }],
    [{ status: null, tweet_id: "1" }],
    [{ tweet_id: "1" }],
    [{ status: "success", code: 34, tweet_id: "1" }],
  ])("treats %j as success", async (payload) => {
    const { stdout, stderr, exitCode } = await runCli(
      ["tweet", "pin", "1"],
      payload,
    );

    expect(stderr.write).not.toHaveBeenCalled();
    expect(exitCode).toBeUndefined();
    expect(stdout.write).toHaveBeenCalledTimes(1);
  });

  it("ignores status fields inside the payload", async () => {
    const { stdout, exitCode } = await runCli(["stream", "users"], {
      status: "success",
      data: [{ id_for_user: "1", status: "error" }],
    });

    expect(exitCode).toBeUndefined();
    expect(stdout.write).toHaveBeenCalledTimes(1);
  });

  it("keeps a suspended account as a successful lookup", async () => {
    const { stdout, exitCode } = await runCli(["user", "info", "gone"], {
      status: "success",
      data: { unavailable: true, unavailableReason: "Suspended" },
    });

    expect(exitCode).toBeUndefined();
    expect(stdout.write).toHaveBeenCalledTimes(1);
  });

  it("uses the detail field on HTTP 400 responses", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ detail: "userName is required" }, 400));
    const client = new TwitterApiClient(
      {
        apiKey: "secret-key",
        baseUrl: "https://api.twitterapi.io",
        timeoutMs: 5_000,
        output: "json",
      },
      fetchMock,
    );

    await expect(client.getJson("/twitter/user/info")).rejects.toMatchObject({
      statusCode: 400,
      message: "userName is required",
    });
  });
});
