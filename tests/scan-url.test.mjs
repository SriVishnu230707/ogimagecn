import assert from "node:assert/strict";
import { test } from "node:test";

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { scanUrlSchema } = await jiti.import("../lib/scan-url.ts");

const validInputs = [
  ["example.com/some-page", "https://example.com/some-page"],
  [
    "  example.com/path?q=hello#card  ",
    "https://example.com/path?q=hello#card",
  ],
  ["https://example.com/path", "https://example.com/path"],
  ["  http://example.com/path  ", "http://example.com/path"],
  ["HTTPS://example.com/path", "HTTPS://example.com/path"],
  ["example.com:8080/path", "https://example.com:8080/path"],
  ["127.0.0.1:8080/path", "https://127.0.0.1:8080/path"],
];

for (const [input, expected] of validInputs) {
  test(`normalizes scan URL ${JSON.stringify(input)}`, () => {
    assert.equal(scanUrlSchema.parse(input), expected);
  });
}

for (const input of [
  "",
  "   ",
  "not a URL",
  "https://",
  "ftp://example.com/image.png",
  "mailto:hello@example.com",
  // oxlint-disable-next-line no-script-url -- Verify script URLs are rejected.
  "javascript:alert(1)",
  "data:text/html,hello",
]) {
  test(`rejects invalid scan URL ${JSON.stringify(input)}`, () => {
    assert.equal(scanUrlSchema.safeParse(input).success, false);
  });
}
