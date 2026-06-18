/* FastEdge Deployment Magic Comments
* appName: "private-shop"
* appId: "847882"
* appUrl: "https://private-shop-4732724.fastedge.cdn.gc.onl/"
* outputFile: "wasm/http/js/privateShop/http_private_shop.wasm"
* buildDirectory: "http/js/privateShop"
*/
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
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
import { ManageSessionsPage } from "./components/ManageSessionsPage";
import { auth, attemptLogin, doLogout, type AuthEnv } from "./auth/middleware";
import { getStrategy } from "./auth/strategy";
import { listSessions, deleteSession, deleteAllSessions, SESSION_COOKIE } from "./auth/session";

const app = new Hono<AuthEnv>();

app.use("*", auth);

// ── Auth routes ──────────────────────────────────────────────────────────────

app.get("/login", (c) => {
  // Header-trust mode has no local login — the edge authenticates upstream.
  if (!getStrategy().localLogin) return c.redirect("/");
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

app.post("/logout", async (c) => {
  await doLogout(c);
  return c.redirect("/");
});

// ── Session management routes (active only in cookie-session mode) ────────────
// Registered unconditionally — AUTH_MODE can only be read at request time (not
// during the Wizer build snapshot), so each handler gates itself: when the
// active mode has no session admin, the route 404s as if it didn't exist.

app.get("/manage-sessions", async (c) => {
  if (!getStrategy().sessionAdmin) return c.notFound();
  const user = c.get("user");
  if (!user) return c.redirect("/login?next=/manage-sessions");
  const sessions = await listSessions();
  const currentSessionId = getCookie(c, SESSION_COOKIE) ?? "";
  return c.html(renderDocument(
    <ManageSessionsPage sessions={sessions} currentSessionId={currentSessionId} user={user} />,
    `Manage Sessions · ${siteConfig.name}`,
    false,
    user,
  ));
});

app.post("/manage-sessions/delete/:id", async (c) => {
  if (!getStrategy().sessionAdmin) return c.notFound();
  const user = c.get("user");
  if (!user) return c.redirect("/login");
  await deleteSession(c.req.param("id"));
  return c.redirect("/manage-sessions");
});

app.post("/manage-sessions/purge", async (c) => {
  if (!getStrategy().sessionAdmin) return c.notFound();
  const user = c.get("user");
  if (!user) return c.redirect("/login");
  await deleteAllSessions();
  return c.redirect("/login");
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
