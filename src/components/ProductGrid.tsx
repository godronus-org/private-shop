import * as React from "react";
import type { Product } from "../data/products";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
