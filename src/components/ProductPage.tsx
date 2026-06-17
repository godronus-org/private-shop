import * as React from "react";
import type { Product } from "../data/products";
import { siteConfig } from "../config";

export function ProductPage({ product }: { product: Product }) {
  const price = `${siteConfig.currency.symbol}${product.price.toFixed(2)}`;
  return (
    <main className="hero">
      <p className="hero-sub">{product.category}</p>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p className="price">{price}</p>
      <p>
        <button type="button" className="buy" data-add-to-basket={product.id} style={{ marginRight: "16px" }}>
          {siteConfig.ctaLabel}
        </button>
        <a href="/products">← Back to products</a>
      </p>
    </main>
  );
}
