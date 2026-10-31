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
  {
    description: 'Say "hello" to the community',
    html: `<meta property="og:title" content="You're invited">
      <meta property='og:description' content='Say "hello" to the community'>
      <meta property="og:image" content="/it's-a-card.png">`,
    image: "/it's-a-card.png",
    title: "You're invited",
  },
  {
    description: "It's ready to share",
    html: `<meta content='A "quoted" title' property='og:title'>
      <meta content="It's ready to share" property="og:description">
      <meta content="/it's-a-card.png" property="og:image">`,
    image: "/it's-a-card.png",
    title: 'A "quoted" title',
  },
  {
    description: "It's ready to share",
    html: `<META PROPERTY = "og:title" CONTENT = "  You're invited  ">
      <META CONTENT = "It's ready to share" NAME = "og:description">
      <meta property="og:image" content="/card.png">`,
    image: "/card.png",
    title: "You're invited",
  },
  {
    description: "",
    html: `<meta property="og:title" content="">
      <meta property='og:description' content=''>
      <meta property="og:image" content="/card.png">`,
    image: "/card.png",
    title: "",
  },
];

for (const [index, fixture] of cases.entries()) {
  test(`reads complete quoted metadata for fixture ${index + 1}`, async (t) => {
    t.mock.method(globalThis, "fetch", (url, options) => {
      assert.equal(new URL(url).hostname, "93.184.216.34");
      return Promise.resolve(
        options.headers.Accept === "text/html,*/*"
          ? new Response(fixture.html, {
              headers: { "Content-Type": "text/html" },
            })
          : new Response(new Uint8Array([1]), {
              headers: { "Content-Length": "1", "Content-Type": "image/png" },
            })
      );
    });

    const response = await POST(
      new Request("https://ogimagecn.test/api/og-test", {
        body: JSON.stringify({ url: "https://93.184.216.34/page" }),
        headers: { "x-forwarded-for": `metadata-quotes-${index}` },
        method: "POST",
      })
    );
    assert.equal(response.status, 200);
    const result = await response.json();

    assert.equal(result.meta.ogTitle, fixture.title);
    assert.equal(result.meta.ogDescription, fixture.description);
    assert.equal(result.imageUrl, `https://93.184.216.34${fixture.image}`);
    assert.ok(
      result.pages.every((page) => page.meta.ogTitle === fixture.title)
    );
    assert.ok(result.images.every((image) => image.ok));
  });
}
