import { Command } from "commander";

import { type ConfigEnv, resolveConfig } from "../core/config.js";
import {
  type FetchLike,
  TwitterApiClient,
  TwitterApiError,
} from "../http/client.js";
import { applyFieldSelection } from "../output/filtering.js";
import { renderError, renderOutput } from "../output/render.js";

export interface UserCommandDependencies {
  env?: ConfigEnv;
  fetch?: FetchLike;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
}

interface UserInfoOptions {
  compact?: boolean;
  fields?: string;
}

interface UserTweetsOptions {
  limit?: string;
  cursor?: string;
  includeReplies?: boolean;
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

interface TweetListResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createUserCommand(deps: UserCommandDependencies = {}): Command {
  const command = new Command("user").description("User-related commands");

  command
    .command("info")
    .description("Get user profile information")
    .argument("<username>", "Twitter username")
    .option("-c, --compact", "Use compact output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: UserInfoOptions,
        commandInstance: Command,
      ) => {
        const client = createClient(commandInstance, deps);
        if (!client) {
          return;
        }

        try {
          const data = await client.client.getJson<Record<string, unknown>>(
            "/twitter/user/info",
            {
              userName: username.replace(/^@/, ""),
            },
          );
          const selected = applyFieldSelection(data, {
            compact: Boolean(options.compact),
            preset: "userInfo",
            ...(options.fields ? { fields: splitFields(options.fields) } : {}),
          });

          client.stdout.write(renderOutput(selected, client.config.output));
        } catch (error) {
          handleCommandError(error, client.stderr);
        }
      },
    );

  command
    .command("tweets")
    .description("Get recent tweets from a user")
    .argument("<username>", "Twitter username")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-r, --include-replies", "Include replies in results")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: UserTweetsOptions,
        commandInstance: Command,
      ) => {
        const client = createClient(commandInstance, deps);
        if (!client) {
          return;
        }

        try {
          const response = await client.client.getJson<TweetListResponse>(
            "/twitter/user/last_tweets",
            {
              userName: username.replace(/^@/, ""),
              ...(options.cursor ? { cursor: options.cursor } : {}),
              ...(options.includeReplies ? { includeReplies: true } : {}),
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

function createClient(commandInstance: Command, deps: UserCommandDependencies) {
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
