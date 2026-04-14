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

interface UpdateProfileOptions {
  name?: string;
  description?: string;
  location?: string;
  url?: string;
}

export function createProfileCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("profile").description("Profile update commands");

  for (const [name, path] of [
    ["update-avatar", "/twitter/update_avatar_v2"],
    ["update-banner", "/twitter/update_banner_v2"],
  ] as const) {
    command
      .command(name)
      .description(`${name.replace("-", " ")}`)
      .argument("<filePath>", "Path to image file")
      .action(
        async (
          filePath: string,
          _options: object,
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
            form.set("file", new File([file.blob], file.filename));
            const data = await context.client.patchMultipart<
              Record<string, unknown>
            >(path, form);
            writeResult(context, data);
          } catch (error) {
            handleCommandError(error, context.stderr);
          }
        },
      );
  }

  command
    .command("update")
    .description("Update profile metadata")
    .option("--name <name>", "Display name")
    .option("--description <description>", "Profile description")
    .option("--location <location>", "Location")
    .option("--url <url>", "Website URL")
    .action(async (options: UpdateProfileOptions, commandInstance: Command) => {
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
        const data = await context.client.patchJson<Record<string, unknown>>(
          "/twitter/update_profile_v2",
          {
            login_cookies: loginCookies,
            proxy,
            ...(options.name ? { name: options.name } : {}),
            ...(options.description
              ? { description: options.description }
              : {}),
            ...(options.location ? { location: options.location } : {}),
            ...(options.url ? { url: options.url } : {}),
          },
        );
        writeResult(context, data);
      } catch (error) {
        handleCommandError(error, context.stderr);
      }
    });

  return command;
}
