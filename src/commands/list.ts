import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  parseLimit,
  selectEnvelope,
  writeResult,
} from "./shared.js";

interface ListOptions {
  cursor?: string;
  limit?: string;
  compact?: boolean;
  fields?: string;
}

interface ListTweetsResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

interface ListUsersResponse {
  users?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createListCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("list").description("Twitter list commands");

  command
    .command("timeline")
    .description("Get list tweet timeline")
    .argument("<listId>", "List ID")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        listId: string,
        options: ListOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const response = await context.client.getJson<ListTweetsResponse>(
            "/twitter/list/tweets_timeline",
            {
              listId,
              ...(options.cursor ? { cursor: options.cursor } : {}),
            },
          );
          writeResult(
            context,
            selectEnvelope(
              {
                items: (response.tweets ?? []).slice(
                  0,
                  parseLimit(options.limit),
                ),
                itemKey: "tweets",
                hasNextPage: response.has_next_page,
                nextCursor: response.next_cursor,
              },
              Boolean(options.compact),
              "tweet",
              options.fields,
            ),
          );
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  for (const [name, path] of [
    ["followers", "/twitter/list/followers"],
    ["members", "/twitter/list/members"],
  ] as const) {
    command
      .command(name)
      .description(`Get list ${name}`)
      .argument("<listId>", "List ID")
      .option("--cursor <cursor>", "Pagination cursor")
      .option("-c, --compact", "Use compact user output")
      .option("-f, --fields <fields>", "Comma-separated fields to keep")
      .action(
        async (
          listId: string,
          options: ListOptions,
          commandInstance: Command,
        ) => {
          const context = createExecutionContext(commandInstance, deps);
          if (!context) {
            return;
          }

          try {
            const response = await context.client.getJson<ListUsersResponse>(
              path,
              {
                list_id: listId,
                ...(options.cursor ? { cursor: options.cursor } : {}),
              },
            );
            writeResult(
              context,
              selectEnvelope(
                {
                  items: response.users ?? [],
                  itemKey: "users",
                  hasNextPage: response.has_next_page,
                  nextCursor: response.next_cursor,
                },
                Boolean(options.compact),
                "userInfo",
                options.fields,
              ),
            );
          } catch (error) {
            handleCommandError(error, context.stderr);
          }
        },
      );
  }

  return command;
}
