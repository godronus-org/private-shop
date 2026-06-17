import * as React from "react";
import type { Product } from "../data/products";
import { ProductGrid } from "./ProductGrid";

export function ShopPage({ products }: { products: Product[] }) {
  return (
    <>
      <main className="hero">
        <h1>Products</h1>
        <p className="hero-sub">
          Featured collection · {products.length} items
        </p>
      </main>
      <section className="catalog">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
