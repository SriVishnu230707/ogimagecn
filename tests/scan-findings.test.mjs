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

const cases = [
  { description: false, title: false },
  { description: true, title: false },
  { description: false, title: true },
  { description: true, title: true },
];

for (const [index, tags] of cases.entries()) {
  test(`reports absent OG tags with title=${tags.title}, description=${tags.description}`, async (t) => {
    const html = `
      <title>HTML fallback title</title>
      <meta name="description" content="HTML fallback description">
      <meta property="og:image" content="/card.png">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:url" content="https://93.184.216.34/page">
      <meta name="twitter:card" content="summary_large_image">
      ${tags.title ? '<meta property="og:title" content="OG title">' : ""}
      ${tags.description ? '<meta property="og:description" content="OG description">' : ""}
    `;
    t.mock.method(globalThis, "fetch", (url) => {
      if (new URL(url).pathname === "/card.png") {
        return Promise.resolve(
          new Response(new Uint8Array([1]), {
            headers: { "Content-Length": "1", "Content-Type": "image/png" },
          })
        );
      }
      assert.equal(new URL(url).pathname, "/page");
      return Promise.resolve(
        new Response(html, {
          headers: { "Content-Type": "text/html" },
        })
      );
    });

    const response = await POST(
      new Request("https://ogimagecn.test/api/og-test", {
        body: JSON.stringify({ url: "https://93.184.216.34/page" }),
        headers: { "x-forwarded-for": `findings-${index}` },
        method: "POST",
      })
    );
    assert.equal(response.status, 200);
    const result = await response.json();

    assert.equal(
      result.meta.title,
      tags.title ? "OG title" : "HTML fallback title"
    );
    assert.equal(
      result.meta.description,
      tags.description ? "OG description" : "HTML fallback description"
    );
    assert.deepEqual(
      result.findings.map((finding) => finding.title),
      [
        ...(tags.title ? [] : ["No og:title"]),
        ...(tags.description ? [] : ["No og:description"]),
      ]
    );
    assert.ok(result.images.every((image) => image.ok));
  });
}
