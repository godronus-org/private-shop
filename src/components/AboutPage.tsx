import * as React from "react";
import { siteConfig } from "../config";

export function AboutPage() {
  return (
    <main className="about">
      <header className="about-hero">
        <p className="hero-sub">About</p>
        <h1>{siteConfig.name}</h1>
        <p className="lede">{siteConfig.tagline}</p>
      </header>

      <section className="about-section">
        <h2>Delivery</h2>
        <p>
          Orders placed before 14:00 local time are dispatched the same business day.
          We ship from our European fulfilment centre to most countries worldwide.
        </p>
        <ul className="info-list">
          <li>
            <strong>Standard ({siteConfig.currency.symbol}5)</strong>
            <span>3–5 business days · tracked</span>
          </li>
          <li>
            <strong>Express ({siteConfig.currency.symbol}12)</strong>
            <span>1–2 business days · tracked &amp; signed</span>
          </li>
          <li>
            <strong>Free shipping</strong>
            <span>on orders over {siteConfig.currency.symbol}120</span>
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Returns</h2>
        <p>
          Not quite right? Return any unused item in original packaging within 30 days
          for a full refund. We cover return postage on faulty or incorrectly shipped items.
        </p>
      </section>

      <section className="about-section">
        <h2>Contact</h2>
        <p>
          Questions about an order or a product? Visit our{" "}
          <a className="contact-link" href="/contact">contact page</a>.
        </p>
      </section>
    </main>
  );
}
