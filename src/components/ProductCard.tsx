import * as React from "react";
import type { Product } from "../data/products";
import { siteConfig } from "../config";

export function ProductCard({ product }: { product: Product }) {
  const price = `${siteConfig.currency.symbol}${product.price.toFixed(2)}`;
  return (
    <article className="card">
      <a href={`/products/${product.id}`}>
        <div className="card-image" style={{ background: product.imageColor }}>
          <span aria-hidden="true">{product.imageEmoji}</span>
          {product.badge ? <span className="badge">{product.badge}</span> : null}
        </div>
      </a>
      <div className="card-body">
        <p className="cat">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="card-foot">
          <span className="price">{price}</span>
          <button type="button" className="buy" data-add-to-basket={product.id}>{siteConfig.ctaLabel}</button>
        </div>
      </div>
    </article>
  );
}
