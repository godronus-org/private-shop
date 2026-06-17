import * as React from "react";
import { siteConfig } from "../config";

export function Header({ user }: { user?: string }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="logo" aria-label={siteConfig.name} dangerouslySetInnerHTML={{ __html: siteConfig.logoSvg }} />
        <nav>
          <a href="/products">Products</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
        <div className="header-right">
          {user ? (
            <>
              <span className="header-user">Hi, {user}</span>
              <form method="POST" action="/logout" style={{ display: "inline" }}>
                <button type="submit" className="btn-signout">Sign out</button>
              </form>
            </>
          ) : (
            <a href="/login" className="btn-signin">Sign in</a>
          )}
          <a href="/basket" className="cart-btn" aria-label="Basket">
            Basket
            <span id="basket-count" className="cart-badge" style={{ display: "none" }}>0</span>
          </a>
        </div>
      </div>
    </header>
  );
}
