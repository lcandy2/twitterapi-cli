import { Command } from "commander";

export function createUserCommand(): Command {
  const command = new Command("user").description("User-related commands");

  command
    .command("info")
    .description("Get user profile information")
    .argument("<username>", "Twitter username")
    .option("-c, --compact", "Use compact output")
    .action((username: string, options: { compact?: boolean }) => {
      const payload = {
        ok: true,
        command: "user info",
        username,
        compact: Boolean(options.compact),
      };

      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    });

  return command;
}
