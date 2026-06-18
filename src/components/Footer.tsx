import * as React from "react";
import { siteConfig } from "../config";
import { sessionAdminEnabled } from "../auth/mode";

export function Footer() {
  const year = new Date().getFullYear();
  // In session mode the © symbol is a hidden link to the /manage-sessions admin
  // page; otherwise it's plain text.
  return (
    <footer className="site-footer">
      <p>
        {sessionAdminEnabled() ? <a href="/manage-sessions">©</a> : "©"} {year}{" "}
        {siteConfig.name}. All rights reserved.
      </p>
    </footer>
  );
}
