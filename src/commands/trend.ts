import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  writeResult,
} from "./shared.js";

interface TrendOptions {
  count?: string;
}

export function createTrendCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("trend").description("Trend commands");

  command
    .command("get")
    .description("Get trends by WOEID")
    .argument("<woeid>", "WOEID")
    .option("--count <number>", "Maximum trends to return")
    .action(
      async (
        woeid: string,
        options: TrendOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/trends",
            {
              woeid,
              ...(options.count ? { count: Number(options.count) } : {}),
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  return command;
}
