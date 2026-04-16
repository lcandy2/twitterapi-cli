import { describe, expect, it } from "vitest";
import {
  extractTweetId,
  extractUsername,
  normalizeTweetIds,
} from "../../src/commands/url-parser.js";

describe("extractTweetId", () => {
  it("returns plain id unchanged", () => {
    expect(extractTweetId("2044505743144194514")).toBe("2044505743144194514");
  });

  it("extracts id from x.com status url", () => {
    expect(
      extractTweetId("https://x.com/pbakaus/status/2044505743144194514?s=46"),
    ).toBe("2044505743144194514");
  });

  it("extracts id from twitter.com status url", () => {
    expect(
      extractTweetId("https://twitter.com/pbakaus/status/2044505743144194514"),
    ).toBe("2044505743144194514");
  });

  it("returns input unchanged for non-url strings", () => {
    expect(extractTweetId("not-a-url")).toBe("not-a-url");
  });
});

describe("extractUsername", () => {
  it("returns plain username unchanged", () => {
    expect(extractUsername("elonmusk")).toBe("elonmusk");
  });

  it("strips leading @", () => {
    expect(extractUsername("@elonmusk")).toBe("elonmusk");
  });

  it("extracts username from x.com profile url", () => {
    expect(extractUsername("https://x.com/elonmusk")).toBe("elonmusk");
  });

  it("extracts username from x.com profile url with trailing path", () => {
    expect(extractUsername("https://x.com/elonmusk/status/123")).toBe(
      "elonmusk",
    );
  });

  it("extracts username from twitter.com profile url", () => {
    expect(extractUsername("https://twitter.com/elonmusk")).toBe("elonmusk");
  });
});

describe("normalizeTweetIds", () => {
  it("normalizes a comma-separated list of ids and urls", () => {
    expect(
      normalizeTweetIds(
        "2044505743144194514,https://x.com/pbakaus/status/2044505743144194515",
      ),
    ).toBe("2044505743144194514,2044505743144194515");
  });
});
