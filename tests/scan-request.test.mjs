import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { fileURLToPath } from "node:url";

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": fileURLToPath(new URL("../", import.meta.url)) },
});
const interval = mock.method(globalThis, "setInterval", () => 0);
const { POST } = await jiti.import("../app/api/og-test/route.ts");
interval.mock.restore();

const invalidBodies = [
  null,
  [],
  "https://example.com",
  42,
  true,
  {},
  { url: null },
  { url: 123 },
  { url: false },
  { url: [] },
  { url: {} },
  { url: "   " },
];

for (const [index, body] of invalidBodies.entries()) {
  test(`rejects invalid scan body ${JSON.stringify(body)}`, async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", () => {
      assert.fail("Invalid input must not trigger a fetch");
    });
    const response = await POST(
      new Request("https://ogimagecn.test/api/og-test", {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `invalid-body-${index}`,
        },
        method: "POST",
      })
    );

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(typeof payload.error, "string");
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

test("rejects malformed JSON", async () => {
  const response = await POST(
    new Request("https://ogimagecn.test/api/og-test", {
      body: "{",
      headers: { "x-forwarded-for": "malformed-json" },
      method: "POST",
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Send a JSON body with a url.",
  });
});

test("keeps URL validation for valid string fields", async () => {
  const response = await POST(
    new Request("https://ogimagecn.test/api/og-test", {
      body: JSON.stringify({ url: "http://127.0.0.1" }),
      headers: { "x-forwarded-for": "private-address" },
      method: "POST",
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "That address is not reachable from the internet.",
  });
});
