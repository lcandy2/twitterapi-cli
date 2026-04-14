import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli.js";
import { loadConfigFile, resolveConfig } from "../../src/core/config.js";
import { type FetchLike, TwitterApiClient } from "../../src/http/client.js";
import { applyFieldSelection } from "../../src/output/filtering.js";

describe("createProgram", () => {
  it("shows top-level commands", () => {
    const program = createProgram();

    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toEqual(["user", "tweet", "auth"]);
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
      new Response(
        JSON.stringify({
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
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
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

  it("renders custom selected fields from the live command handler", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: {
            id: "12",
            userName: "jack",
            name: "Jack",
            description: "founder",
            followers: 100,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
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
      "--fields",
      "id,userName",
    ]);

    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          id: "12",
          userName: "jack",
        },
        null,
        2,
      )}\n`,
    );
  });

  it("renders compact user tweets with pagination metadata", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      new Response(
        JSON.stringify({
          tweets: [
            {
              id: "t1",
              text: "hello",
              createdAt: "now",
              likeCount: 5,
              extra: true,
            },
            {
              id: "t2",
              text: "world",
              createdAt: "later",
              likeCount: 6,
            },
          ],
          has_next_page: true,
          next_cursor: "cursor-2",
          status: "success",
          message: "ok",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const program = createProgram({
      fetch: fetchMock,
      env: { TWITTERAPI_KEY: "env-key" },
    });
    await program.parseAsync([
      "node",
      "twitterapi",
      "user",
      "tweets",
      "jack",
      "--limit",
      "1",
      "--compact",
      "--cursor",
      "cursor-1",
      "--include-replies",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          tweets: [
            {
              id: "t1",
              text: "hello",
              createdAt: "now",
              likeCount: 5,
            },
          ],
          count: 1,
          has_next_page: true,
          next_cursor: "cursor-2",
        },
        null,
        2,
      )}\n`,
    );
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
      }),
      { encoding: "utf8", flag: "w" },
    );

    expect(loadConfigFile({ homeDir: tempHome })).toEqual({
      apiKey: "file-key",
      baseUrl: "https://example.com",
      timeoutMs: 42_000,
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
      },
      {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_BASE_URL: "https://env.example.com",
        TWITTERAPI_TIMEOUT_MS: "15000",
      },
      {
        apiKey: "file-key",
        baseUrl: "https://file.example.com",
        timeoutMs: 60_000,
      },
    );

    expect(config.apiKey).toBe("cli-key");
    expect(config.baseUrl).toBe("https://env.example.com");
    expect(config.timeoutMs).toBe(15_000);
    expect(config.output).toBe("jsonl");
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
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify({ status: "success", data: { id: "1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
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
    expect(init?.headers).toMatchObject({ "x-api-key": "secret-key" });
  });

  it("throws a typed error when the API responds with an error status", async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify({ status: "error", msg: "User not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
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
