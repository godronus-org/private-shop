import * as React from "react";
import type { Context } from "hono";
import { renderDocument } from "../render";
import { siteConfig } from "../config";

// Logs the internal detail to the FastEdge debug log and returns a generic
// 503 page safe to show end-users. Config key names and internal state must
// never appear in the response body.
export function configError(c: Context, detail: string): Response {
  console.error(`[private-shop] misconfiguration: ${detail}`);
  return c.html(
    renderDocument(
      <main className="hero">
        <h1>Service unavailable</h1>
        <p className="hero-sub">
          Authentication is temporarily unavailable. Please try again later or{" "}
          <a href="/">return to {siteConfig.name}</a>.
        </p>
      </main>,
      `Service unavailable · ${siteConfig.name}`,
    ),
    503,
  );
}
