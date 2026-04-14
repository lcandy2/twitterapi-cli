import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  requireLoginCookies,
  requireProxy,
  splitCsv,
  writeResult,
} from "./shared.js";

interface SendDmOptions {
  mediaIds?: string;
  replyToMessageId?: string;
}

export function createDmCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("dm").description("Direct message commands");

  command
    .command("send")
    .description("Send a DM")
    .argument("<userId>", "Target user ID")
    .argument("<text>", "DM text")
    .option("--media-ids <ids>", "Comma-separated media IDs")
    .option("--reply-to-message-id <messageId>", "Reply to message ID")
    .action(
      async (
        userId: string,
        text: string,
        options: SendDmOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        const loginCookies = requireLoginCookies(context);
        const proxy = requireProxy(context);
        if (!loginCookies || !proxy) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/twitter/send_dm_to_user",
            {
              login_cookies: loginCookies,
              user_id: userId,
              text,
              proxy,
              ...(options.mediaIds
                ? { media_ids: splitCsv(options.mediaIds) }
                : {}),
              ...(options.replyToMessageId
                ? { reply_to_message_id: options.replyToMessageId }
                : {}),
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
