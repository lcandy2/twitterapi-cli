import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  requireProxy,
  writeResult,
} from "./shared.js";

interface LoginOptions {
  userName?: string;
  email?: string;
  password?: string;
  totpSecret?: string;
}

export function createAuthCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("auth").description("Authentication helpers");

  command
    .command("whoami")
    .description("Show the current auth mode")
    .action((_options: object, commandInstance: Command) => {
      const context = createExecutionContext(commandInstance, deps);
      if (!context) {
        return;
      }
      writeResult(context, {
        ok: true,
        command: "auth whoami",
        authMode: context.config.loginCookies ? "login-cookie" : "api-key",
      });
    });

  command
    .command("login")
    .description("Log in and obtain login cookies")
    .requiredOption("--user-name <userName>", "Twitter username")
    .requiredOption("--email <email>", "Twitter account email")
    .requiredOption("--password <password>", "Twitter account password")
    .option("--totp-secret <totpSecret>", "TOTP secret")
    .action(async (options: LoginOptions, commandInstance: Command) => {
      const context = createExecutionContext(commandInstance, deps);
      if (!context) {
        return;
      }
      const proxy = requireProxy(context);
      if (!proxy) {
        return;
      }
      try {
        const data = await context.client.postJson<Record<string, unknown>>(
          "/twitter/user_login_v2",
          {
            user_name: options.userName ?? "",
            email: options.email ?? "",
            password: options.password ?? "",
            proxy,
            ...(options.totpSecret ? { totp_secret: options.totpSecret } : {}),
          },
        );
        writeResult(context, data);
      } catch (error) {
        handleCommandError(error, context.stderr);
      }
    });

  return command;
}
