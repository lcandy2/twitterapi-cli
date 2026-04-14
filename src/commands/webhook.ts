import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  writeResult,
} from "./shared.js";

interface RuleOptions {
  intervalSeconds?: string;
  isEffect?: string;
}

export function createWebhookCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("webhook").description(
    "Webhook/WebSocket rule commands",
  );

  command
    .command("add-rule")
    .description("Add a tweet filter rule")
    .argument("<tag>", "Rule tag")
    .argument("<value>", "Rule value")
    .requiredOption(
      "--interval-seconds <seconds>",
      "Polling interval in seconds",
    )
    .action(
      async (
        tag: string,
        value: string,
        options: RuleOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/oapi/tweet_filter/add_rule",
            {
              tag,
              value,
              interval_seconds: Number(options.intervalSeconds ?? "0"),
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("get-rules")
    .description("Get all tweet filter rules")
    .action(async (_options: object, commandInstance: Command) => {
      const context = createExecutionContext(commandInstance, deps);
      if (!context) {
        return;
      }
      try {
        const data = await context.client.getJson<Record<string, unknown>>(
          "/oapi/tweet_filter/get_rules",
        );
        writeResult(context, data);
      } catch (error) {
        handleCommandError(error, context.stderr);
      }
    });

  command
    .command("update-rule")
    .description("Update a tweet filter rule")
    .argument("<ruleId>", "Rule ID")
    .argument("<tag>", "Rule tag")
    .argument("<value>", "Rule value")
    .requiredOption(
      "--interval-seconds <seconds>",
      "Polling interval in seconds",
    )
    .option("--is-effect <0|1>", "Whether the rule is active")
    .action(
      async (
        ruleId: string,
        tag: string,
        value: string,
        options: RuleOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/oapi/tweet_filter/update_rule",
            {
              rule_id: ruleId,
              tag,
              value,
              interval_seconds: Number(options.intervalSeconds ?? "0"),
              ...(options.isEffect
                ? { is_effect: Number(options.isEffect) }
                : {}),
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("delete-rule")
    .description("Delete a tweet filter rule")
    .argument("<ruleId>", "Rule ID")
    .action(
      async (ruleId: string, _options: object, commandInstance: Command) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        try {
          const data = await context.client.deleteJson<Record<string, unknown>>(
            "/oapi/tweet_filter/delete_rule",
            { rule_id: ruleId },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  return command;
}
