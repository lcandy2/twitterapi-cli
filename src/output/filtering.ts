const USER_INFO_COMPACT_FIELDS = [
  "id",
  "userName",
  "name",
  "description",
  "followers",
  "following",
  "profilePicture",
] as const;

export interface FieldSelectionOptions {
  compact?: boolean;
  preset?: "userInfo";
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
    return pickFields(value, [...USER_INFO_COMPACT_FIELDS]);
  }

  return value;
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
