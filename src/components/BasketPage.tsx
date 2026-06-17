import * as React from "react";

export function BasketPage() {
  return (
    <div className="basket-page">
      <h1>Your Basket</h1>
      <div id="basket-items">
        <p className="basket-empty">Your basket is empty. <a href="/products">Browse products</a></p>
      </div>
      <noscript>
        <p style={{ color: "#666" }}>Please enable JavaScript to use your basket.</p>
      </noscript>
    </div>
  );
}
