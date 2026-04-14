import type { OutputMode } from "../core/config.js";

export function renderOutput(data: unknown, output: OutputMode): string {
  if (output === "jsonl") {
    return `${JSON.stringify(data)}\n`;
  }

  return `${JSON.stringify(data, null, 2)}\n`;
}

export function renderError(error: {
  type: string;
  message: string;
  status_code?: number;
  details?: unknown;
}): string {
  return `${JSON.stringify(error, null, 2)}\n`;
}
