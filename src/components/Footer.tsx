import * as React from "react";
import { siteConfig } from "../config";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
    </footer>
  );
}
