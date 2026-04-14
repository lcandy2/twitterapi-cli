import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  writeResult,
} from "./shared.js";

export function createStreamCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("stream").description(
    "Tweet stream monitor commands",
  );

  command
    .command("add-user")
    .description("Add a user to monitor")
    .argument("<username>", "Twitter username")
    .action(
      async (username: string, _options: object, commandInstance: Command) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/oapi/x_user_stream/add_user_to_monitor_tweet",
            { x_user_name: username.replace(/^@/, "") },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("remove-user")
    .description("Remove a monitored user by monitor ID")
    .argument("<monitorId>", "Monitor entry ID")
    .action(
      async (monitorId: string, _options: object, commandInstance: Command) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/oapi/x_user_stream/remove_user_to_monitor_tweet",
            { id_for_user: monitorId },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("users")
    .description("List monitored users")
    .action(async (_options: object, commandInstance: Command) => {
      const context = createExecutionContext(commandInstance, deps);
      if (!context) {
        return;
      }
      try {
        const data = await context.client.getJson<Record<string, unknown>>(
          "/oapi/x_user_stream/get_user_to_monitor_tweet",
        );
        writeResult(context, data);
      } catch (error) {
        handleCommandError(error, context.stderr);
      }
    });

  return command;
}
