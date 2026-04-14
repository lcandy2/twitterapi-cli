import { Command } from "commander";

import { type ConfigEnv, resolveConfig } from "../core/config.js";
import {
  type FetchLike,
  TwitterApiClient,
  TwitterApiError,
} from "../http/client.js";
import { applyFieldSelection } from "../output/filtering.js";
import { renderError, renderOutput } from "../output/render.js";

export interface TweetCommandDependencies {
  env?: ConfigEnv;
  fetch?: FetchLike;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
}

interface TweetSearchOptions {
  limit?: string;
  cursor?: string;
  queryType?: "Latest" | "Top";
  compact?: boolean;
  fields?: string;
}

interface GlobalOptions {
  json?: boolean;
  jsonl?: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: string;
}

interface TweetSearchResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createTweetCommand(
  deps: TweetCommandDependencies = {},
): Command {
  const command = new Command("tweet").description("Tweet-related commands");

  command
    .command("search")
    .description("Search tweets")
    .argument("<query>", "Search query")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option(
      "--query-type <queryType>",
      "Search ranking: Latest or Top",
      "Latest",
    )
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        query: string,
        options: TweetSearchOptions,
        commandInstance: Command,
      ) => {
        const client = createClient(commandInstance, deps);
        if (!client) {
          return;
        }

        try {
          const response = await client.client.getJson<TweetSearchResponse>(
            "/twitter/tweet/advanced_search",
            {
              query,
              queryType: options.queryType ?? "Latest",
              ...(options.cursor ? { cursor: options.cursor } : {}),
            },
          );

          const limit = parseLimit(options.limit);
          const tweets = (response.tweets ?? []).slice(0, limit).map((tweet) =>
            applyFieldSelection(tweet, {
              compact: Boolean(options.compact),
              preset: "tweet",
              ...(options.fields
                ? { fields: splitFields(options.fields) }
                : {}),
            }),
          );

          client.stdout.write(
            renderOutput(
              {
                tweets,
                count: tweets.length,
                has_next_page: response.has_next_page ?? false,
                next_cursor: response.next_cursor ?? "",
              },
              client.config.output,
            ),
          );
        } catch (error) {
          handleCommandError(error, client.stderr);
        }
      },
    );

  return command;
}

function createClient(
  commandInstance: Command,
  deps: TweetCommandDependencies,
) {
  const stdout = deps.stdout ?? process.stdout;
  const stderr = deps.stderr ?? process.stderr;
  const globals = commandInstance.optsWithGlobals<GlobalOptions>();
  const config = resolveConfig(
    {
      ...(globals.apiKey ? { apiKey: globals.apiKey } : {}),
      ...(globals.baseUrl ? { baseUrl: globals.baseUrl } : {}),
      ...(globals.timeout ? { timeoutMs: Number(globals.timeout) } : {}),
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

function handleCommandError(
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

function splitFields(raw: string): string[] {
  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

function parseLimit(raw: string | undefined): number {
  const parsed = Number(raw ?? "20");

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 100);
}
