import { z } from "zod";

export const scanUrlSchema = z
  .string()
  .trim()
  .transform((value) => {
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
    // A bare hostname followed by a port is not a URL scheme.
    const hasPort = /^[^/?#:]+:\d+(?:[/?#]|$)/.test(value);
    return hasScheme && !hasPort ? value : `https://${value}`;
  })
  .pipe(
    z.url({
      error: "Enter a valid HTTP or HTTPS URL",
      protocol: /^https?$/,
    })
  );
