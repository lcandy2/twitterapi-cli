const USER_INFO_COMPACT_FIELDS = [
  "id",
  "userName",
  "name",
  "description",
  "followers",
  "following",
  "profilePicture",
] as const;

// Community member objects use these field names instead of the usual ones.
const USER_INFO_FIELD_ALIASES: Record<string, string> = {
  userName: "screen_name",
  followers: "followers_count",
  following: "following_count",
  profilePicture: "profile_image_url_https",
};

const TWEET_COMPACT_FIELDS = [
  "id",
  "text",
  "createdAt",
  "retweetCount",
  "replyCount",
  "likeCount",
  "quoteCount",
  "viewCount",
  "bookmarkCount",
  "url",
] as const;

export interface FieldSelectionOptions {
  compact?: boolean;
  preset?: "userInfo" | "tweet";
  fields?: string[];
}

export function applyFieldSelection(
  value: Record<string, unknown>,
  options: FieldSelectionOptions,
): Record<string, unknown> {
  if (options.fields && options.fields.length > 0) {
    return pickFields(value, options.fields);
  }

  if (options.compact && options.preset === "userInfo") {
    return pickCompactUser(value);
  }

  if (options.compact && options.preset === "tweet") {
    return pickFields(value, [...TWEET_COMPACT_FIELDS]);
  }

  return value;
}

function pickCompactUser(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of USER_INFO_COMPACT_FIELDS) {
    const source = field in value ? field : USER_INFO_FIELD_ALIASES[field];
    if (source && source in value) {
      result[field] = value[source];
    }
  }

  return result;
}

function pickFields(
  value: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    if (field in value) {
      result[field] = value[field];
    }
  }

  return result;
}
