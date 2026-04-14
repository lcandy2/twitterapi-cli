import { Command } from "commander";

export function createAuthCommand(): Command {
  const command = new Command("auth").description("Authentication helpers");

  command
    .command("whoami")
    .description("Show the current auth mode")
    .action(() => {
      const payload = {
        ok: true,
        command: "auth whoami",
        authMode: process.env.TWITTERAPI_KEY ? "api-key" : "anonymous",
      };

      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    });

  return command;
}
