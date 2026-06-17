import * as React from "react";

export function CheckoutPage({ user }: { user: string }) {
  return (
    <main className="page">
      <div className="checkout-page">
        <h1>Checkout</h1>
        <p className="checkout-welcome">Signed in as <strong>{user}</strong></p>
        <div id="checkout-items">
          <p className="basket-empty">Your basket is empty. <a href="/products">Browse products</a></p>
        </div>
      </div>
    </main>
  );
}
