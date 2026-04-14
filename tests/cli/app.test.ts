import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";
import { resolveConfig } from "../../src/core/config.js";

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
});

describe("resolveConfig", () => {
  it("defaults to public api url and timeout", () => {
    const config = resolveConfig({});

    expect(config.baseUrl).toBe("https://api.twitterapi.io");
    expect(config.timeoutMs).toBe(30_000);
    expect(config.output).toBe("json");
  });

  it("prefers explicit values over env defaults", () => {
    const config = resolveConfig(
      {
        apiKey: "cli-key",
        output: "jsonl",
      },
      {
        TWITTERAPI_KEY: "env-key",
        TWITTERAPI_BASE_URL: "https://example.com",
        TWITTERAPI_TIMEOUT_MS: "15000",
      },
    );

    expect(config.apiKey).toBe("cli-key");
    expect(config.baseUrl).toBe("https://example.com");
    expect(config.timeoutMs).toBe(15_000);
    expect(config.output).toBe("jsonl");
  });
});
