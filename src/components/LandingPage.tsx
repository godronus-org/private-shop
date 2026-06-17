import * as React from "react";
import { siteConfig } from "../config";

export function LandingPage() {
  return (
    <div className="landing">

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <h1>Sourced with care.<br />Made to last.</h1>
          <p>
            A curated collection of exceptional goods from independent producers
            who share our commitment to craft, sustainability, and quality.
          </p>
          <div className="landing-hero-actions">
            <a href="/products" className="btn-hero-primary">Browse the collection</a>
            <a href="/login" className="btn-hero-secondary">Member login</a>
          </div>
        </div>
      </section>

      <section className="landing-about">
        <div className="landing-about-inner">
          <p className="eyebrow">Our story</p>
          <h2>A boutique built on relationships</h2>
          <p>
            {siteConfig.name} began as a small collective of people who believed that what you
            bring into your home should have a story worth telling. For over a decade we have
            worked directly with local producers — artisans, small-batch makers, and family-run
            workshops — to bring you goods that are genuinely difficult to find elsewhere.
            Every item in our collection supports sustainable production practices and is made
            from materials selected for their longevity and low environmental impact.
            We are not a marketplace. We are a membership, and every product earns its place.
          </p>
        </div>
      </section>

      <section className="landing-values">
        <div className="landing-values-inner">
          <h2>What we stand for</h2>
          <div className="values-grid">
            <div className="value-card">
              <span className="value-icon">🤝</span>
              <h3>Direct from producers</h3>
              <p>
                We source exclusively from the makers themselves — no intermediaries,
                no distributors. This means better prices for you and fairer returns
                for the people who actually create the work.
              </p>
            </div>
            <div className="value-card">
              <span className="value-icon">🌱</span>
              <h3>Sustainable by design</h3>
              <p>
                Every supplier in our network is assessed against our sustainability
                criteria: materials, packaging, labour practices, and carbon footprint.
                We review annually and hold ourselves accountable in our impact report.
              </p>
            </div>
            <div className="value-card">
              <span className="value-icon">✦</span>
              <h3>Uncompromising quality</h3>
              <p>
                Our editorial team handles and tests every product before it joins
                the collection. If it does not meet the standard we would set for
                our own homes, it does not make the cut.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Ready to explore?</h2>
        <p>Members get early access to new arrivals and exclusive pricing.</p>
        <a href="/products" className="btn-cta">Browse the collection</a>
      </section>

    </div>
  );
}
