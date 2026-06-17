/* FastEdge Deployment Magic Comments
* appName: "private-shop"
* appId: "847882"
* appUrl: "https://private-shop-4732724.fastedge.cdn.gc.onl/"
* outputFile: "wasm/http/js/privateShop/http_private_shop.wasm"
* buildDirectory: "http/js/privateShop"
*/
import { Hono } from "hono";
import { renderDocument } from "./render";
import { siteConfig } from "./config";
import { products } from "./data/products";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { CheckoutPage } from "./components/CheckoutPage";
import { AboutPage } from "./components/AboutPage";
import { ContactPage } from "./components/ContactPage";
import { ShopPage } from "./components/ShopPage";
import { ProductPage } from "./components/ProductPage";
import { BasketPage } from "./components/BasketPage";
import { jwtAuth, ssoBootstrap, attemptLogin, doLogout, type AuthEnv } from "./auth/middleware";

const app = new Hono<AuthEnv>();

app.use("*", jwtAuth);
app.use("/checkout", ssoBootstrap);

// ── Auth routes ──────────────────────────────────────────────────────────────

app.get("/login", (c) => {
  const next = c.req.query("next") || "/";
  return c.html(renderDocument(<LoginPage next={next} />, `Login · ${siteConfig.name}`));
});

app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const next = String(body.next ?? "/");
  if (await attemptLogin(username, password, c)) return c.redirect(next || "/");
  return c.html(renderDocument(<LoginPage next={next} error="Invalid username or password" />, `Login · ${siteConfig.name}`), 401);
});

app.post("/logout", (c) => {
  doLogout(c);
  return c.redirect("/");
});

// ── Protected routes ─────────────────────────────────────────────────────────

app.get("/checkout", (c) => {
  const user = c.get("user");
  if (!user) return c.redirect("/login?next=/checkout");
  return c.html(renderDocument(<CheckoutPage user={user} />, `Checkout · ${siteConfig.name}`, false, user));
});

// ── Public routes ────────────────────────────────────────────────────────────

app.get("/", (c) => c.html(renderDocument(<LandingPage />, siteConfig.name, true, c.get("user"))));

app.get("/about", (c) => c.html(renderDocument(<AboutPage />, `About · ${siteConfig.name}`, false, c.get("user"))));

app.get("/contact", (c) => c.html(renderDocument(<ContactPage />, `Contact · ${siteConfig.name}`, false, c.get("user"))));

app.get("/products", (c) => c.html(renderDocument(<ShopPage products={products} />, `Products · ${siteConfig.name}`, false, c.get("user"))));

app.get("/products/:productId", (c) => {
  const product = products.find((p) => p.id === c.req.param("productId"));
  if (!product) {
    return c.html(renderDocument(
      <main className="hero"><h1>Product not found</h1><p><a href="/products">← Back to products</a></p></main>,
      `Not found · ${siteConfig.name}`, false, c.get("user")
    ), 404);
  }
  return c.html(renderDocument(<ProductPage product={product} />, `${product.name} · ${siteConfig.name}`, false, c.get("user")));
});

app.get("/basket", (c) => c.html(renderDocument(<BasketPage />, `Basket · ${siteConfig.name}`, false, c.get("user"))));

app.get("/favicon.svg", (c) =>
  c.body(siteConfig.faviconSvg, 200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" })
);

app.get("/favicon.ico", (c) =>
  c.body(siteConfig.faviconSvg, 200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" })
);

app.notFound((c) =>
  c.html(renderDocument(
    <main className="hero"><h1>Page not found</h1><p className="hero-sub"><a href="/">Return to {siteConfig.name}</a></p></main>,
    `Not found · ${siteConfig.name}`, false, c.get("user")
  ), 404)
);

addEventListener("fetch", (event) => {
  event.respondWith(app.fetch(event.request));
});
