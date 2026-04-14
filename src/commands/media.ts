import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  fileToUploadPart,
  handleCommandError,
  requireLoginCookies,
  requireProxy,
  writeResult,
} from "./shared.js";

interface MediaOptions {
  longVideo?: boolean;
}

export function createMediaCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("media").description("Media upload commands");

  command
    .command("upload")
    .description("Upload media")
    .argument("<filePath>", "Path to media file")
    .option("--long-video", "Mark upload as a long video")
    .action(
      async (
        filePath: string,
        options: MediaOptions,
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
          const form = new FormData();
          const file = fileToUploadPart(filePath);
          form.set("login_cookies", loginCookies);
          form.set("proxy", proxy);
          if (options.longVideo) {
            form.set("is_long_video", "true");
          }
          form.set("file", new File([file.blob], file.filename));
          const data = await context.client.postMultipart<
            Record<string, unknown>
          >("/twitter/upload_media_v2", form);
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  return command;
}
