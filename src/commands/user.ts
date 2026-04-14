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

interface GlobalOptions {
  json?: boolean;
  jsonl?: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: string;
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
          return;
        }

        const client = new TwitterApiClient(config, deps.fetch);

        try {
          const data = await client.getJson<Record<string, unknown>>(
            "/twitter/user/info",
            {
              userName: username.replace(/^@/, ""),
            },
          );
          const selected = applyFieldSelection(data, {
            compact: Boolean(options.compact),
            preset: "userInfo",
            ...(options.fields
              ? {
                  fields: options.fields
                    .split(",")
                    .map((field) => field.trim())
                    .filter(Boolean),
                }
              : {}),
          });

          stdout.write(renderOutput(selected, config.output));
        } catch (error) {
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
      },
    );

  return command;
}
