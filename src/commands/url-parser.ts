export function extractTweetId(input: string): string {
  if (!input.includes("/")) {
    return input;
  }
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/status(?:es)?\/(\d+)/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    // ignore invalid URLs
  }
  return input;
}

export function extractUsername(input: string): string {
  const stripped = input.replace(/^@/, "");
  if (!stripped.includes("/")) {
    return stripped;
  }
  try {
    const url = new URL(stripped);
    const match = url.pathname.match(/^\/([A-Za-z0-9_]+)(?:\/.*)?$/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    // ignore invalid URLs
  }
  return stripped;
}

export function normalizeTweetIds(input: string): string {
  return input
    .split(",")
    .map((s) => extractTweetId(s.trim()))
    .join(",");
}
