import { Command } from "commander";

export function createTweetCommand(): Command {
  const command = new Command("tweet").description("Tweet-related commands");

  command
    .command("search")
    .description("Search tweets")
    .argument("<query>", "Search query")
    .option("-l, --limit <number>", "Maximum results", "20")
    .action((query: string, options: { limit?: string }) => {
      const payload = {
        ok: true,
        command: "tweet search",
        query,
        limit: Number(options.limit ?? "20"),
      };

      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    });

  return command;
}
