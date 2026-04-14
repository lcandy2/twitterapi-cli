import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  parseLimit,
  requireLoginCookies,
  requireProxy,
  selectEnvelope,
  writeResult,
} from "./shared.js";

interface CommunityReadOptions {
  cursor?: string;
  limit?: string;
  queryType?: "Latest" | "Top";
  compact?: boolean;
  fields?: string;
}

interface CommunityActionOptions {
  description?: string;
}

interface TweetsResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

interface UsersResponse {
  users?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createCommunityCommand(
  deps: CommandDependencies = {},
): Command {
  const command = new Command("community").description("Community commands");

  command
    .command("info")
    .description("Get community info by ID")
    .argument("<communityId>", "Community ID")
    .action(
      async (
        communityId: string,
        _options: CommunityReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/community/info",
            { community_id: communityId },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  for (const [name, path, itemKey, preset] of [
    ["members", "/twitter/community/members", "users", "userInfo"],
    ["moderators", "/twitter/community/moderators", "users", "userInfo"],
    ["tweets", "/twitter/community/tweets", "tweets", "tweet"],
  ] as const) {
    command
      .command(name)
      .description(`Get community ${name}`)
      .argument("<communityId>", "Community ID")
      .option("--cursor <cursor>", "Pagination cursor")
      .option("-l, --limit <number>", "Maximum items to return", "20")
      .option(
        "-c, --compact",
        `Use compact ${itemKey === "tweets" ? "tweet" : "user"} output`,
      )
      .option("-f, --fields <fields>", "Comma-separated fields to keep")
      .action(
        async (
          communityId: string,
          options: CommunityReadOptions,
          commandInstance: Command,
        ) => {
          const context = createExecutionContext(commandInstance, deps);
          if (!context) {
            return;
          }

          try {
            const response = await context.client.getJson<
              TweetsResponse & UsersResponse
            >(path, {
              community_id: communityId,
              ...(options.cursor ? { cursor: options.cursor } : {}),
            });
            const items =
              itemKey === "tweets"
                ? (response.tweets ?? [])
                : (response.users ?? []);
            writeResult(
              context,
              selectEnvelope(
                {
                  items: items.slice(0, parseLimit(options.limit)),
                  itemKey,
                  hasNextPage: response.has_next_page,
                  nextCursor: response.next_cursor,
                },
                Boolean(options.compact),
                preset,
                options.fields,
              ),
            );
          } catch (error) {
            handleCommandError(error, context.stderr);
          }
        },
      );
  }

  command
    .command("search")
    .description("Search tweets from all communities")
    .argument("<query>", "Search query")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--query-type <queryType>", "Latest or Top", "Latest")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        query: string,
        options: CommunityReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const response = await context.client.getJson<TweetsResponse>(
            "/twitter/community/get_tweets_from_all_community",
            {
              query,
              queryType: options.queryType ?? "Latest",
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

  command
    .command("create")
    .description("Create a community")
    .argument("<name>", "Community name")
    .requiredOption("--description <description>", "Community description")
    .action(
      async (
        name: string,
        options: CommunityActionOptions,
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
            "/twitter/create_community_v2",
            {
              login_cookies: loginCookies,
              name,
              description: options.description ?? "",
              proxy,
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("delete")
    .description("Delete a community")
    .argument("<communityId>", "Community ID")
    .argument("<communityName>", "Community name")
    .action(
      async (
        communityId: string,
        communityName: string,
        _options: CommunityReadOptions,
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
            "/twitter/delete_community_v2",
            {
              login_cookies: loginCookies,
              community_id: communityId,
              community_name: communityName,
              proxy,
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  for (const [name, path] of [
    ["join", "/twitter/join_community_v2"],
    ["leave", "/twitter/leave_community_v2"],
  ] as const) {
    command
      .command(name)
      .description(`${name} a community`)
      .argument("<communityId>", "Community ID")
      .action(
        async (
          communityId: string,
          _options: CommunityReadOptions,
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
              path,
              {
                login_cookies: loginCookies,
                community_id: communityId,
                proxy,
              },
            );
            writeResult(context, data);
          } catch (error) {
            handleCommandError(error, context.stderr);
          }
        },
      );
  }

  return command;
}
