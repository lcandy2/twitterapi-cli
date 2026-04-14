import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  writeResult,
} from "./shared.js";

export function createMyCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("my").description("My-account commands");

  command
    .command("info")
    .description("Get my account info")
    .action(async (_options: object, commandInstance: Command) => {
      const context = createExecutionContext(commandInstance, deps);
      if (!context) {
        return;
      }
      try {
        const data =
          await context.client.getJson<Record<string, unknown>>(
            "/oapi/my/info",
          );
        writeResult(context, data);
      } catch (error) {
        handleCommandError(error, context.stderr);
      }
    });

  return command;
}
