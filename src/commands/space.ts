import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  writeResult,
} from "./shared.js";

export function createSpaceCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("space").description("Twitter Space commands");

  command
    .command("detail")
    .description("Get space detail")
    .argument("<spaceId>", "Space ID")
    .action(
      async (spaceId: string, _options: object, commandInstance: Command) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/spaces/detail",
            { space_id: spaceId },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  return command;
}
